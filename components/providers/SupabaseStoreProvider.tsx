"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapBook, mapOrder, mapProfile, type BookRow, type OrderRow, type ProfileRow } from "@/lib/supabase/mappers";
import * as cartLogic from "@/lib/core/cart";
import { validateCheckoutForm } from "@/lib/core/checkout";
import type { ActionResult, StoreValue } from "@/lib/data/types";
import type { Book, CartItem, Order, Profile } from "@/lib/types";
import { StoreContext } from "./store-context";

const ORDER_SELECT = "*, order_items(book_id, title, unit_price, quantity), order_status_events(status, created_at)";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const okVoid: ActionResult = { ok: true, value: undefined };

/**
 * SUPABASE MODE provider. All reads/writes go through the anon key + the signed-in
 * user's session, so Row Level Security decides what each user can see or change.
 * Checkout, stock updates, order status changes and role changes call SQL functions
 * that check the caller's role inside the database (see supabase/migrations).
 */
export function SupabaseStoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(undefined);
  const [user, setUser] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track the auth session.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const loadBooks = useCallback(async () => {
    const { data, error } = await supabase.from("books").select("*").order("title");
    if (error) throw error;
    setBooks((data as BookRow[]).map(mapBook));
  }, [supabase]);

  const loadUserData = useCallback(
    async (uid: string | null) => {
      if (!uid) {
        setUser(null);
        setCart([]);
        setOrders([]);
        setProfiles([]);
        return;
      }
      const { data: profileRow, error: pErr } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (pErr) throw pErr;
      const profile = mapProfile(profileRow as ProfileRow);
      setUser(profile);

      const [cartRes, ordersRes] = await Promise.all([
        supabase.from("cart_items").select("book_id, quantity").eq("user_id", uid).order("created_at"),
        supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }),
      ]);
      if (cartRes.error) throw cartRes.error;
      if (ordersRes.error) throw ordersRes.error;
      setCart(cartRes.data.map((r) => ({ bookId: r.book_id as string, quantity: r.quantity as number })));
      setOrders((ordersRes.data as OrderRow[]).map(mapOrder));

      if (profile.role === "admin") {
        const { data, error } = await supabase.from("profiles").select("*").order("created_at");
        if (error) throw error;
        setProfiles((data as ProfileRow[]).map(mapProfile));
      } else {
        setProfiles([]);
      }
    },
    [supabase],
  );

  // Load everything whenever the signed-in user changes.
  useEffect(() => {
    if (authUserId === undefined) return;
    let active = true;
    (async () => {
      try {
        await Promise.all([loadBooks(), loadUserData(authUserId)]);
        if (active) setLoadError(null);
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : "Could not load data from Supabase.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [authUserId, loadBooks, loadUserData]);

  const refresh = useCallback(async () => {
    try {
      await Promise.all([loadBooks(), loadUserData(authUserId ?? null)]);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load data from Supabase.");
    }
  }, [authUserId, loadBooks, loadUserData]);

  const value = useMemo<StoreValue>(() => {
    const requireUser = () => (user ? null : fail("Please sign in first."));

    const saveCartQuantity = async (bookId: string, quantity: number): Promise<ActionResult> => {
      const { error } = await supabase
        .from("cart_items")
        .upsert({ user_id: user!.id, book_id: bookId, quantity }, { onConflict: "user_id,book_id" });
      if (error) return fail(error.message);
      await refresh();
      return okVoid;
    };

    return {
      mode: "supabase",
      ready,
      loadError,
      user,
      books,
      cart,
      orders,
      profiles,

      async addToCart(bookId, quantity) {
        const denied = requireUser();
        if (denied) return fail("Please sign in to add books to your cart.");
        const book = books.find((b) => b.id === bookId);
        if (!book) return fail("Book not found.");
        const result = cartLogic.addToCart(cart, book, quantity);
        if (!result.ok) return result;
        const newQty = result.cart.find((i) => i.bookId === bookId)!.quantity;
        return saveCartQuantity(bookId, newQty);
      },

      async updateCartQuantity(bookId, quantity) {
        const denied = requireUser();
        if (denied) return denied;
        const book = books.find((b) => b.id === bookId);
        if (!book) return fail("Book not found.");
        const result = cartLogic.setCartQuantity(cart, book, quantity);
        if (!result.ok) return result;
        return saveCartQuantity(bookId, quantity);
      },

      async removeFromCart(bookId) {
        const denied = requireUser();
        if (denied) return denied;
        const { error } = await supabase.from("cart_items").delete().eq("user_id", user!.id).eq("book_id", bookId);
        if (error) return fail(error.message);
        await refresh();
        return okVoid;
      },

      async placeOrder(form) {
        const denied = requireUser();
        if (denied) return denied;
        const fieldErrors = validateCheckoutForm(form);
        if (Object.keys(fieldErrors).length > 0) {
          return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
        }
        // Atomic database transaction: checks stock, creates order + items, reduces stock, clears cart.
        const { data, error } = await supabase.rpc("place_order", {
          p_recipient_name: form.recipientName.trim(),
          p_phone: form.phone.replace(/[\s-]/g, ""),
          p_city: form.city.trim(),
          p_address: form.address.trim(),
        });
        if (error) {
          await refresh();
          return fail(error.message);
        }
        const { data: row, error: readErr } = await supabase.from("orders").select(ORDER_SELECT).eq("id", data as string).single();
        await refresh();
        if (readErr) return fail(readErr.message);
        return { ok: true, value: mapOrder(row as OrderRow) };
      },

      async setStock(bookId, stock) {
        const { error } = await supabase.rpc("set_book_stock", { p_book_id: bookId, p_stock: stock });
        if (error) return fail(error.message);
        await refresh();
        return okVoid;
      },

      async advanceOrderStatus(orderId) {
        const { error } = await supabase.rpc("advance_order_status", { p_order_id: orderId });
        if (error) return fail(error.message);
        const { data, error: readErr } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).single();
        await refresh();
        if (readErr) return fail(readErr.message);
        return { ok: true, value: mapOrder(data as OrderRow) };
      },

      async setUserRole(userId, role) {
        const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
        if (error) return fail(error.message);
        await refresh();
        return okVoid;
      },

      refresh,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return fail(error.message);
        return okVoid;
      },

      async signUp(fullName, email, password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // full_name is the ONLY metadata used. The role is always set to 'customer' by the database trigger.
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) return fail(error.message);
        return { ok: true, value: { needsConfirmation: !data.session } };
      },

      async signOut() {
        await supabase.auth.signOut();
      },
    };
  }, [supabase, ready, loadError, user, books, cart, orders, profiles, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

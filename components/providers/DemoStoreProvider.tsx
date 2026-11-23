"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { DEMO_STORAGE_KEY, DemoStore, type DemoState } from "@/lib/demo/demo-store";
import type { StoreValue } from "@/lib/data/types";
import { StoreContext } from "./store-context";

let singleton: DemoStore | null = null;

function getDemoStore(): DemoStore {
  if (!singleton) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null; // private mode / blocked storage: data lives only in memory
    }
    singleton = new DemoStore(storage);
  }
  return singleton;
}

const subscribe = (listener: () => void) => getDemoStore().subscribe(listener);
const getSnapshot = (): DemoState => getDemoStore().getState();
const getServerSnapshot = (): DemoState | null => null;

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  // Observer: React subscribes to the demo store and re-renders on every change.
  const state = useSyncExternalStore<DemoState | null>(subscribe, getSnapshot, getServerSnapshot);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_STORAGE_KEY) getDemoStore().reloadFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const run = useCallback(<T,>(fn: (s: DemoStore) => T) => Promise.resolve(fn(getDemoStore())), []);

  const value = useMemo<StoreValue>(() => {
    // `state` is only used to trigger recomputation; reads go through the store.
    const store = state ? getDemoStore() : null;
    return {
      mode: "demo",
      ready: !!state,
      loadError: null,
      user: store?.activeUser ?? null,
      books: state?.books ?? [],
      cart: store?.currentCart() ?? [],
      orders: store?.visibleOrders() ?? [],
      profiles: store?.visibleProfiles() ?? [],
      addToCart: (bookId, qty) => run((s) => s.addToCart(bookId, qty)),
      updateCartQuantity: (bookId, qty) => run((s) => s.updateCartQuantity(bookId, qty)),
      removeFromCart: (bookId) => run((s) => s.removeFromCart(bookId)),
      placeOrder: (form) => run((s) => s.placeOrder(form)),
      setStock: (bookId, stock) => run((s) => s.setStock(bookId, stock)),
      advanceOrderStatus: (orderId) => run((s) => s.advanceOrderStatus(orderId)),
      setUserRole: (userId, role) => run((s) => s.setUserRole(userId, role)),
      refresh: async () => getDemoStore().reloadFromStorage(),
      switchPersona: (userId) => getDemoStore().switchPersona(userId),
      resetDemo: () => getDemoStore().reset(),
      signOut: async () => getDemoStore().signOut(),
    };
  }, [state, run]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

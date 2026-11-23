// DEMO MODE data store.
// Keeps all data in the browser (localStorage). It is NOT secure and NOT shared between
// devices. It exists so the site can be demonstrated without any cloud setup.
//
// Observer-style update mechanism: components subscribe() to the store and are notified
// (listeners called) every time the state changes, e.g. when a warehouse manager moves an
// order from "Processing" to "Shipped", the customer's order page re-renders with the new
// status. Changes made in another browser tab are picked up via the "storage" event.

import type { CartItem, CheckoutForm, Order, Role } from "@/lib/types";
import type { Book, Profile } from "@/lib/types";
import * as cartLogic from "@/lib/core/cart";
import { placeOrder } from "@/lib/core/checkout";
import { canChangeRole, canManageInventory } from "@/lib/core/access";
import { formatOrderNumber, nextStatus } from "@/lib/core/orders";
import { MAX_STOCK } from "@/lib/core/inventory";
import { DEMO_USERS, SEED_BOOKS, buildSeedOrders } from "./seed";
import type { ActionResult } from "@/lib/data/types";

export const DEMO_STORAGE_KEY = "booknest-demo-state-v1";

export interface DemoState {
  version: 1;
  books: Book[];
  users: Profile[];
  carts: Record<string, CartItem[]>;
  orders: Order[];
  activeUserId: string | null;
  nextOrderNumber: number;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createSeedState(reference = new Date()): DemoState {
  const orders = buildSeedOrders(reference);
  return {
    version: 1,
    books: SEED_BOOKS.map((b) => ({ ...b })),
    users: DEMO_USERS.map((u) => ({ ...u })),
    carts: {},
    orders,
    activeUserId: "demo-customer",
    nextOrderNumber: orders.length + 1,
  };
}

function isDemoState(value: unknown): value is DemoState {
  const v = value as DemoState;
  return !!v && v.version === 1 && Array.isArray(v.books) && Array.isArray(v.users) && Array.isArray(v.orders);
}

type Listener = (state: DemoState) => void;

const ok = (): ActionResult => ({ ok: true, value: undefined });
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export class DemoStore {
  private state: DemoState;
  private listeners = new Set<Listener>();

  constructor(
    private storage: KeyValueStorage | null,
    private newId: () => string = () => crypto.randomUUID(),
    private now: () => Date = () => new Date(),
  ) {
    this.state = this.load();
  }

  // ---------- Observer: subscribe / notify ----------
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(next: DemoState) {
    this.state = next;
    this.storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
    this.listeners.forEach((l) => l(next));
  }

  /** Reloads from storage (used when another tab changed the data). */
  reloadFromStorage() {
    this.state = this.load();
    this.listeners.forEach((l) => l(this.state));
  }

  getState(): DemoState {
    return this.state;
  }

  private load(): DemoState {
    try {
      const raw = this.storage?.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isDemoState(parsed)) return parsed;
      }
    } catch {
      // corrupted data: fall back to a fresh seed
    }
    const seed = createSeedState(this.now());
    this.storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  // ---------- Session ----------
  get activeUser(): Profile | null {
    return this.state.users.find((u) => u.id === this.state.activeUserId) ?? null;
  }

  switchPersona(userId: string) {
    if (!this.state.users.some((u) => u.id === userId)) return;
    this.commit({ ...this.state, activeUserId: userId });
  }

  signOut() {
    this.commit({ ...this.state, activeUserId: null });
  }

  reset() {
    this.commit(createSeedState(this.now()));
  }

  // ---------- Visibility rules (mirror the Supabase RLS policies) ----------
  visibleOrders(): Order[] {
    const user = this.activeUser;
    if (!user) return [];
    const orders = canManageInventory(user.role)
      ? this.state.orders
      : this.state.orders.filter((o) => o.userId === user.id);
    return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  visibleProfiles(): Profile[] {
    return this.activeUser?.role === "admin" ? this.state.users : [];
  }

  currentCart(): CartItem[] {
    const user = this.activeUser;
    return user ? (this.state.carts[user.id] ?? []) : [];
  }

  // ---------- Customer actions ----------
  private withCart(update: (cart: CartItem[], books: Book[]) => cartLogic.CartResult): ActionResult {
    const user = this.activeUser;
    if (!user) return fail("Choose a demo persona first.");
    const result = update(this.currentCart(), this.state.books);
    if (!result.ok) return result;
    this.commit({ ...this.state, carts: { ...this.state.carts, [user.id]: result.cart } });
    return ok();
  }

  addToCart(bookId: string, quantity: number): ActionResult {
    const book = this.state.books.find((b) => b.id === bookId);
    if (!book) return fail("Book not found.");
    return this.withCart((cart) => cartLogic.addToCart(cart, book, quantity));
  }

  updateCartQuantity(bookId: string, quantity: number): ActionResult {
    const book = this.state.books.find((b) => b.id === bookId);
    if (!book) return fail("Book not found.");
    return this.withCart((cart) => cartLogic.setCartQuantity(cart, book, quantity));
  }

  removeFromCart(bookId: string): ActionResult {
    return this.withCart((cart) => ({ ok: true, cart: cartLogic.removeFromCart(cart, bookId) }));
  }

  /** Simulated, all-or-nothing order placement (see lib/core/checkout.ts). */
  placeOrder(form: CheckoutForm): ActionResult<Order> {
    const user = this.activeUser;
    if (!user) return fail("Choose a demo persona first.");
    const result = placeOrder({
      books: this.state.books,
      cart: this.currentCart(),
      form,
      userId: user.id,
      customerName: user.fullName,
      orderId: this.newId(),
      orderNumber: formatOrderNumber(this.state.nextOrderNumber),
      now: this.now().toISOString(),
    });
    if (!result.ok) return result;
    // Single commit: stock, order and empty cart are saved together.
    this.commit({
      ...this.state,
      books: result.books,
      orders: [...this.state.orders, result.order],
      carts: { ...this.state.carts, [user.id]: [] },
      nextOrderNumber: this.state.nextOrderNumber + 1,
    });
    return { ok: true, value: result.order };
  }

  // ---------- Warehouse actions ----------
  setStock(bookId: string, stock: number): ActionResult {
    if (!canManageInventory(this.activeUser?.role)) return fail("Only warehouse managers or administrators can change stock.");
    if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) return fail(`Stock must be a whole number from 0 to ${MAX_STOCK}.`);
    if (!this.state.books.some((b) => b.id === bookId)) return fail("Book not found.");
    this.commit({ ...this.state, books: this.state.books.map((b) => (b.id === bookId ? { ...b, stock } : b)) });
    return ok();
  }

  advanceOrderStatus(orderId: string): ActionResult<Order> {
    if (!canManageInventory(this.activeUser?.role)) return fail("Only warehouse managers or administrators can update order status.");
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return fail("Order not found.");
    const next = nextStatus(order.status);
    if (!next) return fail("This order is already delivered.");
    const updated: Order = { ...order, status: next, history: [...order.history, { status: next, at: this.now().toISOString() }] };
    this.commit({ ...this.state, orders: this.state.orders.map((o) => (o.id === orderId ? updated : o)) });
    return { ok: true, value: updated };
  }

  // ---------- Admin actions ----------
  setUserRole(userId: string, role: Role): ActionResult {
    const actor = this.activeUser;
    if (!actor || !canChangeRole(actor.role, actor.id, userId)) {
      return fail(actor?.id === userId ? "You cannot change your own role." : "Only administrators can change roles.");
    }
    if (!this.state.users.some((u) => u.id === userId)) return fail("User not found.");
    this.commit({ ...this.state, users: this.state.users.map((u) => (u.id === userId ? { ...u, role } : u)) });
    return ok();
  }
}

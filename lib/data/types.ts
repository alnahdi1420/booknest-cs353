import type { Book, CartItem, CheckoutForm, Order, Profile, Role } from "@/lib/types";
import type { CheckoutErrors } from "@/lib/core/checkout";

export type DataMode = "demo" | "supabase";

export type ActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: string; fieldErrors?: CheckoutErrors };

/**
 * The single interface every page uses. It has two implementations:
 *  - Demo Mode  -> components/providers/DemoStoreProvider.tsx (browser localStorage)
 *  - Supabase   -> components/providers/SupabaseStoreProvider.tsx (Auth + Postgres + RLS)
 */
export interface StoreValue {
  mode: DataMode;
  ready: boolean;
  loadError: string | null;
  user: Profile | null;
  books: Book[];
  cart: CartItem[];
  /** Orders the current user may see: own orders for customers, all orders for staff. */
  orders: Order[];
  /** All profiles (administrators only; empty for others). */
  profiles: Profile[];

  addToCart(bookId: string, quantity: number): Promise<ActionResult>;
  updateCartQuantity(bookId: string, quantity: number): Promise<ActionResult>;
  removeFromCart(bookId: string): Promise<ActionResult>;
  placeOrder(form: CheckoutForm): Promise<ActionResult<Order>>;
  setStock(bookId: string, stock: number): Promise<ActionResult>;
  advanceOrderStatus(orderId: string): Promise<ActionResult<Order>>;
  setUserRole(userId: string, role: Role): Promise<ActionResult>;
  refresh(): Promise<void>;

  // Demo Mode only
  switchPersona?(userId: string): void;
  resetDemo?(): void;

  // Supabase Mode only
  signIn?(email: string, password: string): Promise<ActionResult>;
  signUp?(fullName: string, email: string, password: string): Promise<ActionResult<{ needsConfirmation: boolean }>>;
  signOut?(): Promise<void>;
}

import type { Book, CartItem } from "@/lib/types";
import { round2 } from "./money";

/** Orders with a subtotal at or above this amount get free delivery. Must match SQL place_order. */
export const FREE_DELIVERY_THRESHOLD = 200;
/** Flat simulated delivery fee in SAR. Must match SQL place_order. */
export const DELIVERY_FEE = 15;

export interface CartLine {
  book: Book;
  quantity: number;
  lineTotal: number;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/** Joins cart items with books. Items whose book no longer exists are dropped. */
export function buildCartLines(cart: CartItem[], books: Book[]): CartLine[] {
  const byId = new Map(books.map((b) => [b.id, b]));
  const lines: CartLine[] = [];
  for (const item of cart) {
    const book = byId.get(item.bookId);
    if (!book) continue;
    lines.push({ book, quantity: item.quantity, lineTotal: round2(book.price * item.quantity) });
  }
  return lines;
}

export function deliveryFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function calculateTotals(lines: { quantity: number; lineTotal: number }[]): CartTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const deliveryFee = deliveryFeeFor(subtotal);
  return {
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    deliveryFee,
    total: round2(subtotal + deliveryFee),
  };
}

/**
 * Validates a requested quantity for a book.
 * Returns an error message, or null if the quantity is valid.
 */
export function validateQuantity(quantity: number, stock: number): string | null {
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) return "Quantity must be a whole number.";
  if (quantity < 1) return "Quantity must be at least 1.";
  if (stock <= 0) return "This book is out of stock.";
  if (quantity > stock) return `Only ${stock} in stock.`;
  return null;
}

export type CartResult = { ok: true; cart: CartItem[] } | { ok: false; error: string };

/** Adds (or increases) a book in the cart without exceeding stock. Input is not mutated. */
export function addToCart(cart: CartItem[], book: Book, quantity: number): CartResult {
  const existing = cart.find((i) => i.bookId === book.id)?.quantity ?? 0;
  const qtyError = validateQuantity(quantity, book.stock);
  if (qtyError) return { ok: false, error: qtyError };
  if (existing + quantity > book.stock) {
    return { ok: false, error: `You already have ${existing} in your cart. Only ${book.stock} in stock.` };
  }
  if (existing > 0) {
    return { ok: true, cart: cart.map((i) => (i.bookId === book.id ? { ...i, quantity: existing + quantity } : i)) };
  }
  return { ok: true, cart: [...cart, { bookId: book.id, quantity }] };
}

/** Sets an exact quantity for a cart line. */
export function setCartQuantity(cart: CartItem[], book: Book, quantity: number): CartResult {
  const error = validateQuantity(quantity, book.stock);
  if (error) return { ok: false, error };
  return { ok: true, cart: cart.map((i) => (i.bookId === book.id ? { ...i, quantity } : i)) };
}

export function removeFromCart(cart: CartItem[], bookId: string): CartItem[] {
  return cart.filter((i) => i.bookId !== bookId);
}

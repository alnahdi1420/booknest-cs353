import type { Book, CartItem, CheckoutForm, Order, OrderItem } from "@/lib/types";
import { buildCartLines, calculateTotals } from "./cart";

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, "");
}

/** Validates the minimal (educational) delivery details. No payment data is collected. */
export function validateCheckoutForm(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const name = form.recipientName.trim();
  if (name.length < 3) errors.recipientName = "Enter the recipient's full name (at least 3 characters).";
  else if (name.length > 80) errors.recipientName = "Name is too long (max 80 characters).";

  if (!/^(\+9665|05)\d{8}$/.test(normalizePhone(form.phone))) {
    errors.phone = "Enter a Saudi mobile number, e.g. 05XXXXXXXX.";
  }

  if (!SAUDI_CITIES.includes(form.city.trim())) errors.city = "Choose a delivery city from the list.";

  const address = form.address.trim();
  if (address.length < 10) errors.address = "Enter a delivery address (at least 10 characters).";
  else if (address.length > 200) errors.address = "Address is too long (max 200 characters).";
  return errors;
}

export interface PlaceOrderInput {
  books: Book[];
  cart: CartItem[];
  form: CheckoutForm;
  userId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  now: string;
}

export type PlaceOrderResult =
  | { ok: true; order: Order; books: Book[] }
  | { ok: false; error: string; fieldErrors?: CheckoutErrors };

/**
 * DEMO MODE checkout. A pure, all-or-nothing function:
 *  1. validates the form,
 *  2. re-checks stock for every line,
 *  3. snapshots unit prices,
 *  4. returns the new order AND the new book list with reduced stock.
 * If any check fails nothing is returned, so the caller cannot save a partial order.
 * (Supabase Mode uses the SQL function public.place_order instead.)
 */
export function placeOrder(input: PlaceOrderInput): PlaceOrderResult {
  const fieldErrors = validateCheckoutForm(input.form);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  if (input.cart.length === 0) return { ok: false, error: "Your cart is empty." };

  const lines = buildCartLines(input.cart, input.books);
  if (lines.length !== input.cart.length) {
    return { ok: false, error: "A book in your cart is no longer available. Please review your cart." };
  }
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return { ok: false, error: `Invalid quantity for "${line.book.title}".` };
    }
    if (line.quantity > line.book.stock) {
      return {
        ok: false,
        error: `Not enough stock for "${line.book.title}". Available: ${line.book.stock}, in cart: ${line.quantity}.`,
      };
    }
  }

  const totals = calculateTotals(lines);
  const items: OrderItem[] = lines.map((l) => ({
    bookId: l.book.id,
    title: l.book.title,
    unitPrice: l.book.price,
    quantity: l.quantity,
  }));
  const qtyById = new Map(items.map((i) => [i.bookId, i.quantity]));
  const books = input.books.map((b) => {
    const qty = qtyById.get(b.id);
    return qty ? { ...b, stock: b.stock - qty } : b;
  });

  const order: Order = {
    id: input.orderId,
    orderNumber: input.orderNumber,
    userId: input.userId,
    customerName: input.customerName,
    recipientName: input.form.recipientName.trim(),
    phone: normalizePhone(input.form.phone),
    city: input.form.city.trim(),
    address: input.form.address.trim(),
    items,
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    status: "placed",
    history: [{ status: "placed", at: input.now }],
    createdAt: input.now,
  };
  return { ok: true, order, books };
}

export const SAUDI_CITIES = [
  "Riyadh",
  "Jeddah",
  "Makkah",
  "Madinah",
  "Dammam",
  "Khobar",
  "Jubail",
  "Dhahran",
  "Taif",
  "Abha",
  "Tabuk",
  "Buraidah",
  "Hail",
  "Najran",
  "Jazan",
];

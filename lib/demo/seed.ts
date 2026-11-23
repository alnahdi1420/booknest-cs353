// DEMO MODE seed data. Educational sample data only, stored in the browser.
import booksJson from "./books.json";
import type { Book, CartItem, Order, Profile } from "@/lib/types";
import { buildCartLines, calculateTotals } from "@/lib/core/cart";
import { formatOrderNumber } from "@/lib/core/orders";

export const SEED_BOOKS: Book[] = booksJson as Book[];

export const DEMO_USERS: Profile[] = [
  { id: "demo-customer", fullName: "Sara Ahmed", email: "sara@demo.booknest", role: "customer", createdAt: "2026-09-01T09:00:00.000Z" },
  { id: "demo-warehouse", fullName: "Faisal Al-Harbi", email: "warehouse@demo.booknest", role: "warehouse_manager", createdAt: "2026-08-15T09:00:00.000Z" },
  { id: "demo-admin", fullName: "Noura Al-Qahtani", email: "admin@demo.booknest", role: "admin", createdAt: "2026-08-01T09:00:00.000Z" },
  { id: "demo-customer-2", fullName: "Omar Khalid", email: "omar@demo.booknest", role: "customer", createdAt: "2026-09-20T09:00:00.000Z" },
  { id: "demo-customer-3", fullName: "Lina Saleh", email: "lina@demo.booknest", role: "customer", createdAt: "2026-10-05T09:00:00.000Z" },
];

/** The three personas shown in the persona switcher. */
export const DEMO_PERSONAS = [
  { userId: "demo-customer", description: "Browse, add to cart, check out, track orders." },
  { userId: "demo-warehouse", description: "Update stock levels and move orders through fulfilment." },
  { userId: "demo-admin", description: "Manage user roles and view the sales dashboard." },
];

interface SeedOrderSpec {
  userId: string;
  recipientName: string;
  city: string;
  daysAgo: number;
  items: CartItem[];
  status: Order["status"];
}

const SEED_ORDER_SPECS: SeedOrderSpec[] = [
  { userId: "demo-customer", recipientName: "Sara Ahmed", city: "Riyadh", daysAgo: 21, status: "delivered", items: [{ bookId: "pride-and-prejudice", quantity: 1 }, { bookId: "the-lantern-keeper", quantity: 1 }] },
  { userId: "demo-customer-2", recipientName: "Omar Khalid", city: "Jeddah", daysAgo: 14, status: "delivered", items: [{ bookId: "clean-steps-software-design", quantity: 2 }, { bookId: "data-structures-plain-english", quantity: 1 }] },
  { userId: "demo-customer-3", recipientName: "Lina Saleh", city: "Dammam", daysAgo: 9, status: "shipped", items: [{ bookId: "stars-over-riyadh", quantity: 3 }] },
  { userId: "demo-customer", recipientName: "Sara Ahmed", city: "Riyadh", daysAgo: 4, status: "processing", items: [{ bookId: "the-quiet-ocean", quantity: 1 }, { bookId: "clean-steps-software-design", quantity: 1 }] },
  { userId: "demo-customer-2", recipientName: "Omar Khalid", city: "Jeddah", daysAgo: 1, status: "placed", items: [{ bookId: "start-lean-grow-smart", quantity: 1 }, { bookId: "the-art-of-war", quantity: 2 }] },
];

const STATUS_FLOW: Order["status"][] = ["placed", "processing", "shipped", "delivered"];

/** Builds sample orders with a fixed reference date so data is stable between resets. */
export function buildSeedOrders(reference: Date): Order[] {
  return SEED_ORDER_SPECS.map((spec, index) => {
    const created = new Date(reference.getTime() - spec.daysAgo * 86_400_000);
    const lines = buildCartLines(spec.items, SEED_BOOKS);
    const totals = calculateTotals(lines);
    const user = DEMO_USERS.find((u) => u.id === spec.userId)!;
    const steps = STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(spec.status) + 1);
    return {
      id: `seed-order-${index + 1}`,
      orderNumber: formatOrderNumber(index + 1),
      userId: spec.userId,
      customerName: user.fullName,
      recipientName: spec.recipientName,
      phone: "0500000000",
      city: spec.city,
      address: "Sample address for demo data, District 1",
      items: lines.map((l) => ({ bookId: l.book.id, title: l.book.title, unitPrice: l.book.price, quantity: l.quantity })),
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      status: spec.status,
      history: steps.map((status, i) => ({
        status,
        at: new Date(created.getTime() + i * 26 * 3_600_000).toISOString(),
      })),
      createdAt: created.toISOString(),
    };
  });
}

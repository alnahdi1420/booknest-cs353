import type { Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "./orders";
import { round2 } from "./money";

export interface TopBook {
  bookId: string;
  title: string;
  quantity: number;
  revenue: number;
}

export interface SalesStats {
  totalOrders: number;
  totalValue: number; // sum of order totals incl. delivery fee
  booksSold: number;
  averageOrderValue: number;
  byStatus: Record<OrderStatus, number>;
  topBooks: TopBook[];
}

/** Computes the admin sales dashboard metrics from recorded orders. */
export function computeSalesStats(orders: Order[], topN = 5): SalesStats {
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  const books = new Map<string, TopBook>();
  let totalValue = 0;
  let booksSold = 0;

  for (const order of orders) {
    byStatus[order.status] += 1;
    totalValue += order.total;
    for (const item of order.items) {
      booksSold += item.quantity;
      const entry = books.get(item.bookId) ?? { bookId: item.bookId, title: item.title, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue = round2(entry.revenue + item.unitPrice * item.quantity);
      books.set(item.bookId, entry);
    }
  }

  const topBooks = [...books.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.title.localeCompare(b.title))
    .slice(0, topN);

  return {
    totalOrders: orders.length,
    totalValue: round2(totalValue),
    booksSold,
    averageOrderValue: orders.length ? round2(totalValue / orders.length) : 0,
    byStatus,
    topBooks,
  };
}

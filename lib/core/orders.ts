import type { OrderStatus } from "@/lib/types";

/** The internal (simulated) fulfilment pipeline. Not a real courier. */
export const ORDER_STATUSES: OrderStatus[] = ["placed", "processing", "shipped", "delivered"];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  placed: "Order received by BookNest.",
  processing: "The warehouse is packing your books.",
  shipped: "Sent out for delivery (internal status only, no real carrier).",
  delivered: "Marked as delivered by the warehouse team.",
};

export function statusIndex(status: OrderStatus): number {
  return ORDER_STATUSES.indexOf(status);
}

/** Returns the next status in the pipeline, or null if the order is already delivered. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = statusIndex(status);
  return i >= 0 && i < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[i + 1] : null;
}

export function formatOrderNumber(n: number): string {
  return `BN-${String(n).padStart(5, "0")}`;
}

import type { Order } from "@/lib/types";
import { ORDER_STATUSES, STATUS_DESCRIPTIONS, STATUS_LABELS, statusIndex } from "@/lib/core/orders";
import { formatDate } from "./ui";

/** Internal order-status tracking: Placed -> Processing -> Shipped -> Delivered. */
export function OrderTimeline({ order }: { order: Order }) {
  const current = statusIndex(order.status);
  return (
    <ol className="relative space-y-6" aria-label="Order tracking timeline">
      {ORDER_STATUSES.map((status, i) => {
        const done = i <= current;
        const event = order.history.find((h) => h.status === status);
        return (
          <li key={status} className="relative flex gap-4">
            {i < ORDER_STATUSES.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[15px] top-8 h-[calc(100%+0.5rem)] w-0.5 ${i < current ? "bg-brand-500" : "bg-line"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                done ? "bg-brand-600 text-white" : "border-2 border-line bg-white text-muted"
              } ${i === current ? "ring-4 ring-brand-100" : ""}`}
            >
              {done ? "✓" : i + 1}
            </span>
            <div className="pt-1">
              <p className={`font-semibold ${done ? "text-ink" : "text-muted"}`}>
                {STATUS_LABELS[status]}
                {i === current && <span className="ml-2 text-xs font-medium text-brand-600">Current status</span>}
              </p>
              <p className="text-sm text-muted">{STATUS_DESCRIPTIONS[status]}</p>
              {event && <p className="mt-0.5 text-xs text-muted">{formatDate(event.at, true)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

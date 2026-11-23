"use client";

import Link from "next/link";
import { useStore } from "@/components/providers/store-context";
import { RoleGuard } from "@/components/RoleGuard";
import { EmptyState, PageHeader, StatusBadge, formatDate } from "@/components/ui";
import { formatSAR } from "@/lib/core/money";

export default function OrdersPage() {
  return (
    <div className="container-page py-10">
      <RoleGuard area="account">
        <OrdersList />
      </RoleGuard>
    </div>
  );
}

function OrdersList() {
  const { orders, user } = useStore();
  // Staff can see all orders (for fulfilment), but "My orders" always shows the user's own orders.
  const mine = orders.filter((o) => o.userId === user?.id);

  return (
    <>
      <PageHeader title="My orders" subtitle="Your order history and current delivery status (internal tracking, not a real courier)." />
      {mine.length === 0 ? (
        <EmptyState title="No orders yet" message="When you place an order it will appear here." action={{ href: "/books", label: "Start shopping" }} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your orders</caption>
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Order</th>
                <th scope="col" className="hidden px-4 py-3 sm:table-cell">Date</th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">Items</th>
                <th scope="col" className="px-4 py-3">Total</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mine.map((o) => (
                <tr key={o.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3 font-semibold">{o.orderNumber}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{formatDate(o.createdAt)}</td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{o.items.reduce((n, i) => n + i.quantity, 0)} book(s)</td>
                  <td className="px-4 py-3 font-medium">{formatSAR(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
                      Track<span className="sr-only"> order {o.orderNumber}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

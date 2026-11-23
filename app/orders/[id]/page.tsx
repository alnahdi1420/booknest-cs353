"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useStore } from "@/components/providers/store-context";
import { RoleGuard } from "@/components/RoleGuard";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Alert, Spinner, StatusBadge, formatDate } from "@/components/ui";
import { formatSAR } from "@/lib/core/money";

export default function OrderDetailPage() {
  return (
    <div className="container-page py-10">
      <RoleGuard area="account">
        <Suspense fallback={<Spinner />}>
          <OrderDetail />
        </Suspense>
      </RoleGuard>
    </div>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const placed = useSearchParams().get("placed") === "1";
  const { orders, user, mode } = useStore();
  // `orders` already contains only what this user may see (own orders, or all for staff).
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-serif text-3xl font-semibold">Order not found</h1>
        <p className="mt-2 text-muted">This order does not exist or belongs to another account.</p>
        <Link href="/orders" className="btn-primary mt-6">Back to my orders</Link>
      </div>
    );
  }

  const isOwner = order.userId === user?.id;

  return (
    <>
      {placed && (
        <div className="card mb-8 border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl text-white" aria-hidden>✓</div>
          <h1 className="mt-3 font-serif text-2xl font-semibold text-emerald-900">Thank you! Your order is placed.</h1>
          <p className="mt-1 text-emerald-900">
            Your order number is <strong className="text-lg">{order.orderNumber}</strong>.
          </p>
          <p className="mt-2 text-xs text-emerald-800">
            Simulated order: no payment was taken. {mode === "demo" ? "Saved in this browser (Demo Mode)." : "Saved in the BookNest database."}
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/orders" className="text-sm text-muted hover:text-brand-700">← My orders</Link>
          <h2 className="mt-1 font-serif text-3xl font-semibold">Order {order.orderNumber}</h2>
          <p className="text-sm text-muted">Placed on {formatDate(order.createdAt, true)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {!isOwner && (
        <Alert tone="info" className="mb-6">
          You are viewing another customer&apos;s order as staff ({order.customerName}).
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="card p-6" aria-labelledby="tracking-heading">
          <h3 id="tracking-heading" className="font-serif text-xl font-semibold">Order tracking</h3>
          <p className="mb-6 mt-1 text-xs text-muted">Internal BookNest status updates. No real shipping carrier is used.</p>
          <OrderTimeline order={order} />
        </section>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="items-heading">
            <h3 id="items-heading" className="font-serif text-xl font-semibold">Items</h3>
            <ul className="mt-3 divide-y divide-line text-sm">
              {order.items.map((i) => (
                <li key={i.bookId} className="flex justify-between gap-3 py-2.5">
                  <span>
                    <Link href={`/books/${i.bookId}`} className="hover:text-brand-700">{i.title}</Link>
                    <span className="block text-xs text-muted">{i.quantity} × {formatSAR(i.unitPrice)} (price at purchase)</span>
                  </span>
                  <span className="shrink-0 font-medium">{formatSAR(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatSAR(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{order.deliveryFee === 0 ? "Free" : formatSAR(order.deliveryFee)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatSAR(order.total)}</dd></div>
            </dl>
          </section>

          <section className="card p-6 text-sm" aria-labelledby="delivery-heading">
            <h3 id="delivery-heading" className="font-serif text-xl font-semibold">Delivery details</h3>
            <p className="mt-3 font-medium">{order.recipientName}</p>
            <p className="text-muted">{order.phone}</p>
            <p className="text-muted">{order.address}</p>
            <p className="text-muted">{order.city}, Saudi Arabia</p>
          </section>
        </div>
      </div>
    </>
  );
}

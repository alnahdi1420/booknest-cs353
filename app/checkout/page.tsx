"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/providers/store-context";
import { RoleGuard } from "@/components/RoleGuard";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { buildCartLines, calculateTotals } from "@/lib/core/cart";
import { SAUDI_CITIES, type CheckoutErrors } from "@/lib/core/checkout";
import { formatSAR } from "@/lib/core/money";
import type { CheckoutForm } from "@/lib/types";

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <RoleGuard area="account">
        <CheckoutContent />
      </RoleGuard>
    </div>
  );
}

function CheckoutContent() {
  const { books, cart, user, placeOrder, mode } = useStore();
  const router = useRouter();
  const [form, setForm] = useState<CheckoutForm>({ recipientName: user?.fullName ?? "", phone: "", city: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState<CheckoutErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lines = buildCartLines(cart, books);
  const totals = calculateTotals(lines);

  if (lines.length === 0 && !submitting) {
    return <EmptyState title="Nothing to check out" message="Your cart is empty." action={{ href: "/books", label: "Browse books" }} />;
  }

  function set<K extends keyof CheckoutForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await placeOrder(form);
      if (result.ok) {
        router.push(`/orders/${result.value.id}?placed=1`);
        return;
      }
      setFieldErrors(result.fieldErrors ?? {});
      setError(result.error);
    } catch {
      setError("Network problem: the order was not placed. Please try again.");
    }
    setSubmitting(false);
  }

  const fieldProps = (key: keyof CheckoutForm) => ({
    id: key,
    name: key,
    "aria-invalid": !!fieldErrors[key],
    "aria-describedby": fieldErrors[key] ? `${key}-error` : undefined,
  });

  const fieldError = (name: keyof CheckoutForm) =>
    fieldErrors[name] ? (
      <p id={`${name}-error`} className="mt-1 text-xs text-red-600">
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <>
      <PageHeader title="Checkout" subtitle="Enter delivery details to place your order." />

      <Alert tone="warning" className="mb-6">
        <strong>Simulated checkout.</strong> This is an educational project. No payment is taken and nothing is
        really shipped. Never enter real card details anywhere on this site — we do not ask for them.
      </Alert>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handleSubmit} noValidate className="card space-y-5 p-6" aria-label="Delivery details">
          <h2 className="font-serif text-xl font-semibold">Delivery details</h2>
          {error && <Alert tone="error">{error}</Alert>}

          <div>
            <label htmlFor="recipientName" className="label">Recipient full name</label>
            <input {...fieldProps("recipientName")} className="input" autoComplete="name" value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
            {fieldError("recipientName")}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="label">Mobile number</label>
              <input {...fieldProps("phone")} className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="05XXXXXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              {fieldError("phone")}
            </div>
            <div>
              <label htmlFor="city" className="label">City</label>
              <select {...fieldProps("city")} className="input" value={form.city} onChange={(e) => set("city", e.target.value)}>
                <option value="">Choose a city...</option>
                {SAUDI_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {fieldError("city")}
            </div>
          </div>

          <div>
            <label htmlFor="address" className="label">Delivery address</label>
            <textarea {...fieldProps("address")} className="input min-h-24" placeholder="District, street, building number" value={form.address} onChange={(e) => set("address", e.target.value)} />
            {fieldError("address")}
          </div>

          <div className="rounded-xl bg-paper p-4 text-sm text-muted">
            <p className="font-medium text-ink">Payment</p>
            <p className="mt-1">No payment is needed. Your order is recorded as a demonstration order.</p>
          </div>

          <button type="submit" className="btn-accent w-full py-3 text-base" disabled={submitting}>
            {submitting ? "Placing order..." : `Place order · ${formatSAR(totals.total)}`}
          </button>
          <p className="text-center text-xs text-muted">
            {mode === "demo"
              ? "Demo Mode: the order is saved in this browser only."
              : "Stock is checked again by the database when you place the order."}
          </p>
        </form>

        <aside className="card h-fit p-6" aria-label="Order summary">
          <h2 className="font-serif text-xl font-semibold">Your order</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {lines.map((l) => (
              <li key={l.book.id} className="flex justify-between gap-3 py-2.5">
                <span>
                  {l.book.title} <span className="text-muted">× {l.quantity}</span>
                </span>
                <span className="shrink-0 font-medium">{formatSAR(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatSAR(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery (simulated)</dt><dd>{totals.deliveryFee === 0 ? "Free" : formatSAR(totals.deliveryFee)}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatSAR(totals.total)}</dd></div>
          </dl>
          <Link href="/cart" className="btn-ghost mt-4 w-full">Edit cart</Link>
        </aside>
      </div>
    </>
  );
}

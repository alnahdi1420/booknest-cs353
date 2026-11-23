"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/providers/store-context";
import { BookCover } from "@/components/BookCover";
import { Alert, EmptyState, PageHeader, Spinner, StockBadge } from "@/components/ui";
import { FREE_DELIVERY_THRESHOLD, buildCartLines, calculateTotals } from "@/lib/core/cart";
import { formatSAR } from "@/lib/core/money";

export default function CartPage() {
  const { ready, books, cart, user, mode, updateCartQuantity, removeFromCart } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!ready) return <Spinner label="Loading your cart..." />;

  if (!user) {
    return (
      <div className="container-page py-10">
        <EmptyState
          title="Sign in to use your cart"
          message={mode === "demo" ? "Choose a demo persona to start shopping." : "Your cart is saved to your account."}
          action={{ href: "/login", label: mode === "demo" ? "Choose a demo persona" : "Sign in" }}
        />
      </div>
    );
  }

  const lines = buildCartLines(cart, books);
  const totals = calculateTotals(lines);
  const hasStockProblem = lines.some((l) => l.quantity > l.book.stock);

  async function change(bookId: string, quantity: number) {
    setBusyId(bookId);
    const result = await updateCartQuantity(bookId, quantity);
    setBusyId(null);
    setErrors((e) => {
      const next = { ...e };
      if (result.ok) delete next[bookId];
      else next[bookId] = result.error;
      return next;
    });
  }

  async function remove(bookId: string) {
    setBusyId(bookId);
    await removeFromCart(bookId);
    setBusyId(null);
  }

  return (
    <div className="container-page py-10">
      <PageHeader title="Your cart" subtitle={`${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"} in your cart`} />

      {lines.length === 0 ? (
        <EmptyState title="Your cart is empty" message="Find a book you like and add it to your cart." action={{ href: "/books", label: "Browse books" }} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4" aria-label="Cart items">
            {lines.map(({ book, quantity, lineTotal }) => (
              <li key={book.id} className="card flex gap-4 p-4 sm:gap-6">
                <Link href={`/books/${book.id}`} className="w-20 shrink-0 sm:w-24">
                  <BookCover book={book} size="sm" />
                </Link>
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link href={`/books/${book.id}`} className="font-serif text-lg font-semibold hover:text-brand-700">
                      {book.title}
                    </Link>
                    <p className="text-sm text-muted">{book.author}</p>
                    <p className="mt-1 text-sm">{formatSAR(book.price)} each</p>
                    <div className="mt-2">
                      <StockBadge stock={book.stock} showCount />
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex items-center gap-1" role="group" aria-label={`Quantity for ${book.title}`}>
                      <button
                        type="button"
                        className="btn-outline h-9 w-9 p-0"
                        aria-label="Decrease quantity"
                        disabled={busyId === book.id || quantity <= 1}
                        onClick={() => change(book.id, quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={book.stock}
                        aria-label={`Quantity of ${book.title}`}
                        className="input h-9 w-16 text-center"
                        value={quantity}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (e.target.value !== "") change(book.id, v);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-outline h-9 w-9 p-0"
                        aria-label="Increase quantity"
                        disabled={busyId === book.id || quantity >= book.stock}
                        onClick={() => change(book.id, quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <p className="font-semibold">{formatSAR(lineTotal)}</p>
                    <button type="button" className="text-sm font-medium text-red-600 hover:underline" onClick={() => remove(book.id)} disabled={busyId === book.id}>
                      Remove
                    </button>
                    {errors[book.id] && <p className="text-xs text-red-600" role="alert">{errors[book.id]}</p>}
                    {quantity > book.stock && (
                      <p className="text-xs text-red-600" role="alert">
                        Only {book.stock} left. Please lower the quantity.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="card h-fit p-6 lg:sticky lg:top-24" aria-label="Order summary">
            <h2 className="font-serif text-xl font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatSAR(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery (simulated)</dt>
                <dd>{totals.deliveryFee === 0 ? "Free" : formatSAR(totals.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatSAR(totals.total)}</dd>
              </div>
            </dl>
            {totals.deliveryFee > 0 && (
              <p className="mt-3 text-xs text-muted">
                Add {formatSAR(FREE_DELIVERY_THRESHOLD - totals.subtotal)} more for free delivery.
              </p>
            )}
            {hasStockProblem && (
              <Alert tone="error" className="mt-4">
                Some quantities are higher than the available stock. Please update your cart.
              </Alert>
            )}
            {hasStockProblem ? (
              <button type="button" className="btn-accent mt-6 w-full" disabled>
                Proceed to checkout
              </button>
            ) : (
              <Link href="/checkout" className="btn-accent mt-6 w-full">
                Proceed to checkout
              </Link>
            )}
            <Link href="/books" className="btn-ghost mt-2 w-full">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

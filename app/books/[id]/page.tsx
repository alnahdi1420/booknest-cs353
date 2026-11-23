"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/providers/store-context";
import { BookCover } from "@/components/BookCover";
import { BookCard } from "@/components/BookCard";
import { Alert, Spinner, StockBadge } from "@/components/ui";
import { formatSAR } from "@/lib/core/money";
import { validateQuantity } from "@/lib/core/cart";

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { books, ready, cart, addToCart, mode, user } = useStore();
  const [qty, setQty] = useState("1");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return <Spinner />;
  const book = books.find((b) => b.id === id);

  if (!book) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold">Book not found</h1>
        <p className="mt-2 text-muted">This book does not exist or was removed from the catalog.</p>
        <Link href="/books" className="btn-primary mt-6">
          Back to all books
        </Link>
      </div>
    );
  }

  const inCart = cart.find((i) => i.bookId === book.id)?.quantity ?? 0;
  const related = books.filter((b) => b.category === book.category && b.id !== book.id).slice(0, 4);
  const quantity = Number(qty);
  const qtyError = qty === "" ? "Enter a quantity." : validateQuantity(quantity, book.stock - inCart);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (qtyError) {
      setMessage({ ok: false, text: inCart > 0 && book!.stock - inCart <= 0 ? "All available copies are already in your cart." : qtyError });
      return;
    }
    setBusy(true);
    const result = await addToCart(book!.id, quantity);
    setBusy(false);
    if (result.ok) {
      setMessage({ ok: true, text: `Added ${quantity} × "${book!.title}" to your cart.` });
      setQty("1");
    } else {
      setMessage({ ok: false, text: result.error });
    }
  }

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/books" className="hover:text-brand-700">Books</Link>
        <span className="mx-2">/</span>
        <Link href={`/books?category=${encodeURIComponent(book.category)}`} className="hover:text-brand-700">
          {book.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{book.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
        <div className="card mx-auto w-full max-w-sm bg-gradient-to-br from-brand-50 to-paper p-10">
          <BookCover book={book} size="lg" />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{book.category}</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight sm:text-4xl">{book.title}</h1>
          <p className="mt-2 text-lg text-muted">by {book.author}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-3xl font-bold">{formatSAR(book.price)}</span>
            <StockBadge stock={book.stock} />
            {book.stock > 0 && <span className="text-sm text-muted">{book.stock} available</span>}
          </div>

          <p className="mt-6 max-w-2xl leading-relaxed text-ink/90">{book.summary}</p>

          <dl className="mt-6 grid max-w-md grid-cols-3 gap-4 text-sm">
            <div className="card p-3">
              <dt className="text-muted">Pages</dt>
              <dd className="font-semibold">{book.pages}</dd>
            </div>
            <div className="card p-3">
              <dt className="text-muted">Published</dt>
              <dd className="font-semibold">{book.year}</dd>
            </div>
            <div className="card p-3">
              <dt className="text-muted">In your cart</dt>
              <dd className="font-semibold">{inCart}</dd>
            </div>
          </dl>

          <form onSubmit={handleAdd} className="mt-8 flex max-w-md flex-wrap items-end gap-3" noValidate>
            <div className="w-28">
              <label htmlFor="qty" className="label">
                Quantity
              </label>
              <input
                id="qty"
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(1, book.stock - inCart)}
                step={1}
                className="input"
                value={qty}
                disabled={book.stock <= 0}
                aria-invalid={!!message && !message.ok}
                aria-describedby="qty-help"
                onChange={(e) => {
                  setQty(e.target.value);
                  setMessage(null);
                }}
              />
            </div>
            <button type="submit" className="btn-primary h-[42px] flex-1" disabled={busy || book.stock <= 0}>
              {book.stock <= 0 ? "Out of stock" : busy ? "Adding..." : "Add to cart"}
            </button>
          </form>
          <p id="qty-help" className="mt-2 text-xs text-muted">
            You can add up to {Math.max(0, book.stock - inCart)} more cop{book.stock - inCart === 1 ? "y" : "ies"}.
          </p>

          {mode === "supabase" && !user && (
            <Alert tone="info" className="mt-4 max-w-md">
              <Link href="/login" className="font-semibold underline">Sign in</Link> to add books to your cart.
            </Alert>
          )}

          {message && (
            <Alert tone={message.ok ? "success" : "error"} className="mt-4 max-w-md">
              {message.text}{" "}
              {message.ok && (
                <Link href="/cart" className="font-semibold underline">
                  View cart
                </Link>
              )}
            </Alert>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-serif text-2xl font-semibold">
            More in {book.category}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

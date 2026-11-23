"use client";

import Link from "next/link";
import { useState } from "react";
import type { Book } from "@/lib/types";
import { formatSAR } from "@/lib/core/money";
import { useStore } from "./providers/store-context";
import { BookCover } from "./BookCover";
import { StockBadge } from "./ui";

export function BookCard({ book }: { book: Book }) {
  const { addToCart } = useStore();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setBusy(true);
    const result = await addToCart(book.id, 1);
    setBusy(false);
    setMessage(result.ok ? { ok: true, text: "Added to cart" } : { ok: false, text: result.error });
    setTimeout(() => setMessage(null), 2500);
  }

  return (
    <article className="group card flex flex-col overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/books/${book.id}`} className="block rounded-lg bg-paper px-6 py-5" aria-label={`View details for ${book.title}`}>
        <div className="mx-auto max-w-[150px] transition group-hover:scale-[1.03]">
          <BookCover book={book} />
        </div>
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{book.category}</p>
        <h3 className="mt-1 line-clamp-2 font-serif text-lg font-semibold leading-snug">
          <Link href={`/books/${book.id}`} className="hover:text-brand-700">
            {book.title}
          </Link>
        </h3>
        <p className="text-sm text-muted">{book.author}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-bold">{formatSAR(book.price)}</span>
          <StockBadge stock={book.stock} />
        </div>
        <button type="button" onClick={handleAdd} disabled={busy || book.stock <= 0} className="btn-primary mt-3 w-full">
          {book.stock <= 0 ? "Out of stock" : busy ? "Adding..." : "Add to cart"}
        </button>
        <p aria-live="polite" className={`mt-2 min-h-4 text-xs ${message?.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message?.text}
        </p>
      </div>
    </article>
  );
}

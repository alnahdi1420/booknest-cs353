"use client";

import Link from "next/link";
import { useStore } from "@/components/providers/store-context";
import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { Alert, Spinner } from "@/components/ui";
import { categoriesOf } from "@/lib/core/catalog";

const CATEGORY_ICONS: Record<string, string> = {
  Fiction: "📖",
  Science: "🔬",
  Technology: "💻",
  Business: "📈",
  History: "🏛️",
  "Self-Development": "🌱",
  Children: "🧸",
};

export default function HomePage() {
  const { books, ready, loadError } = useStore();
  const featured = books.filter((b) => b.featured).slice(0, 4);
  const heroBooks = featured.slice(0, 3);
  const categories = categoriesOf(books);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-brand-50 via-paper to-accent-100/40">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
              <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden /> New season, new stories
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find your next <span className="text-brand-600">favourite book</span>.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Explore classics, science, technology and stories for children. Add books to your cart,
              place an order, and follow it from <em>Placed</em> to <em>Delivered</em>.
            </p>
            <form action="/books" className="mt-8 flex max-w-lg gap-2" role="search">
              <label htmlFor="hero-search" className="sr-only">
                Search by title or author
              </label>
              <input id="hero-search" name="q" className="input rounded-full px-5" placeholder="Search by title or author..." />
              <button type="submit" className="btn-primary shrink-0">
                Search
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/books" className="btn-accent">
                Browse all books
              </Link>
              <Link href="/orders" className="btn-outline">
                Track my orders
              </Link>
            </div>
          </div>

          <div className="relative mx-auto hidden h-[380px] w-full max-w-md sm:block" aria-hidden>
            <div className="absolute inset-0 rounded-[3rem] bg-brand-100/60 blur-2xl" />
            {heroBooks.map((book, i) => (
              <div
                key={book.id}
                className="absolute w-44 transition"
                style={{
                  left: `${8 + i * 26}%`,
                  top: `${i === 1 ? 4 : 16}%`,
                  transform: `rotate(${(i - 1) * 8}deg)`,
                  zIndex: i === 1 ? 3 : 1,
                }}
              >
                <BookCover book={book} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page">
        {loadError && <Alert tone="error" className="mt-8">Could not load books: {loadError}</Alert>}

        {/* Categories */}
        <section className="py-14" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="font-serif text-2xl font-semibold">
            Shop by category
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {categories.map((c) => (
              <Link
                key={c}
                href={`/books?category=${encodeURIComponent(c)}`}
                className="card flex flex-col items-center gap-2 px-3 py-5 text-center text-sm font-medium transition hover:border-brand-500 hover:text-brand-700"
              >
                <span className="text-2xl" aria-hidden>
                  {CATEGORY_ICONS[c] ?? "📚"}
                </span>
                {c}
                <span className="text-xs font-normal text-muted">{books.filter((b) => b.category === c).length} books</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured */}
        <section aria-labelledby="featured-heading">
          <div className="flex items-end justify-between">
            <h2 id="featured-heading" className="font-serif text-2xl font-semibold">
              Featured books
            </h2>
            <Link href="/books" className="text-sm font-semibold text-brand-700 hover:underline">
              View all →
            </Link>
          </div>
          {!ready ? (
            <Spinner label="Loading books..." />
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="mt-16 grid gap-4 md:grid-cols-3" aria-label="How BookNest works">
          {[
            { t: "1. Search & choose", d: "Search by title or author, filter by category, and check live stock." },
            { t: "2. Simulated checkout", d: "Enter a delivery name and address. No card details, no real payment." },
            { t: "3. Track your order", d: "Follow internal statuses: Placed, Processing, Shipped, Delivered." },
          ].map((s) => (
            <div key={s.t} className="card p-6">
              <p className="font-serif text-lg font-semibold">{s.t}</p>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

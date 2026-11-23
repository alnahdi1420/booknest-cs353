"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useStore } from "@/components/providers/store-context";
import { BookCard } from "@/components/BookCard";
import { Alert, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { SORT_OPTIONS, categoriesOf, filterBooks, isSortKey } from "@/lib/core/catalog";

export function CatalogView() {
  const { books, ready, loadError } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sortParam = params.get("sort");
  const sort = isSortKey(sortParam) ? sortParam : "featured";

  const categories = useMemo(() => categoriesOf(books), [books]);
  const results = useMemo(() => filterBooks(books, { q, category, sort }), [books, q, category, sort]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      <PageHeader title="Browse books" subtitle="Search by title or author, filter by category, and sort the results." />

      <div className="card mb-8 grid gap-4 p-4 sm:grid-cols-[1fr_200px_200px]">
        <div>
          <label htmlFor="search" className="label">
            Search
          </label>
          <input
            id="search"
            type="search"
            className="input"
            placeholder="Title or author, e.g. Austen"
            defaultValue={q}
            onChange={(e) => update("q", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="category" className="label">
            Category
          </label>
          <select id="category" className="input" value={category} onChange={(e) => update("category", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="label">
            Sort by
          </label>
          <select id="sort" className="input" value={sort} onChange={(e) => update("sort", e.target.value === "featured" ? "" : e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError && <Alert tone="error" className="mb-6">Could not load books: {loadError}</Alert>}

      {!ready ? (
        <Spinner label="Loading books..." />
      ) : results.length === 0 ? (
        <EmptyState
          title="No books match your search"
          message={`We could not find books for "${q || category}". Try another word or clear the filters.`}
          action={{ href: "/books", label: "Clear filters" }}
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            Showing {results.length} of {books.length} books
            {category && ` in ${category}`}
            {q && ` for "${q}"`}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

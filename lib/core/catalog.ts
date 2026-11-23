import type { Book } from "@/lib/types";

export type SortKey = "featured" | "title" | "price-asc" | "price-desc" | "newest";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "title", label: "Title (A-Z)" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest first" },
];

export function isSortKey(value: string | null | undefined): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

export interface CatalogQuery {
  q?: string;
  category?: string;
  sort?: SortKey;
}

/** Keyword search (title or author), category filter and sorting. Pure function. */
export function filterBooks(books: Book[], { q = "", category = "", sort = "featured" }: CatalogQuery): Book[] {
  const needle = q.trim().toLowerCase();
  const result = books.filter((b) => {
    if (category && b.category !== category) return false;
    if (!needle) return true;
    return b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle);
  });
  const sorted = [...result];
  switch (sort) {
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price || a.title.localeCompare(b.title));
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price || a.title.localeCompare(b.title));
      break;
    case "newest":
      sorted.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
      break;
    default:
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
  }
  return sorted;
}

export function categoriesOf(books: Book[]): string[] {
  return [...new Set(books.map((b) => b.category))].sort();
}

export const LOW_STOCK_THRESHOLD = 5;
export const MAX_STOCK = 10000;

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

export const STOCK_LABELS: Record<StockLevel, string> = {
  out: "Out of stock",
  low: "Low stock",
  ok: "In stock",
};

/**
 * Parses a stock value typed by a warehouse manager.
 * Accepts only whole numbers between 0 and MAX_STOCK.
 */
export function parseStockInput(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, error: "Enter a stock quantity." };
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: "Stock must be a whole number (0 or more)." };
  const value = Number(trimmed);
  if (value > MAX_STOCK) return { ok: false, error: `Stock cannot be more than ${MAX_STOCK}.` };
  return { ok: true, value };
}

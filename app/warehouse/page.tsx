"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/components/providers/store-context";
import { RoleGuard } from "@/components/RoleGuard";
import { Alert, EmptyState, PageHeader, StatusBadge, StockBadge, formatDate } from "@/components/ui";
import { LOW_STOCK_THRESHOLD, parseStockInput, stockLevel, type StockLevel } from "@/lib/core/inventory";
import { STATUS_LABELS, nextStatus } from "@/lib/core/orders";
import type { Book } from "@/lib/types";

export default function WarehousePage() {
  return (
    <div className="container-page py-10">
      <RoleGuard area="warehouse">
        <WarehouseDashboard />
      </RoleGuard>
    </div>
  );
}

function WarehouseDashboard() {
  const { books, orders } = useStore();
  const [tab, setTab] = useState<"inventory" | "orders">("inventory");

  const lowCount = books.filter((b) => stockLevel(b.stock) === "low").length;
  const outCount = books.filter((b) => stockLevel(b.stock) === "out").length;
  const units = books.reduce((n, b) => n + b.stock, 0);
  const openOrders = orders.filter((o) => o.status !== "delivered").length;

  return (
    <>
      <PageHeader title="Warehouse dashboard" subtitle="Update stock levels and move orders through fulfilment." />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Book titles" value={books.length} />
        <Stat label="Units in stock" value={units} />
        <Stat label={`Low stock (≤ ${LOW_STOCK_THRESHOLD})`} value={lowCount} tone="amber" />
        <Stat label="Out of stock" value={outCount} tone="red" />
      </div>

      <div className="mb-6 flex gap-2" role="tablist" aria-label="Warehouse sections">
        <button type="button" role="tab" aria-selected={tab === "inventory"} className={tab === "inventory" ? "btn-primary" : "btn-outline"} onClick={() => setTab("inventory")}>
          Inventory
        </button>
        <button type="button" role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "btn-primary" : "btn-outline"} onClick={() => setTab("orders")}>
          Order fulfilment {openOrders > 0 && <span className="rounded-full bg-accent-500 px-2 text-xs text-white">{openOrders}</span>}
        </button>
      </div>

      {tab === "inventory" ? <InventoryTable books={books} /> : <FulfilmentList />}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" | "red" }) {
  const color = tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-600" : "text-ink";
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InventoryTable({ books }: { books: Book[] }) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"" | StockLevel>("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return books
      .filter((b) => (!level || stockLevel(b.stock) === level) && (!needle || b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle)))
      .sort((a, b) => a.stock - b.stock || a.title.localeCompare(b.title));
  }, [books, q, level]);

  return (
    <section aria-label="Inventory">
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_220px]">
        <div>
          <label htmlFor="inv-search" className="label">Search inventory</label>
          <input id="inv-search" type="search" className="input" placeholder="Title or author" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label htmlFor="inv-level" className="label">Stock level</label>
          <select id="inv-level" className="input" value={level} onChange={(e) => setLevel(e.target.value as "" | StockLevel)}>
            <option value="">All levels</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock</option>
            <option value="ok">In stock</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No books match" message="Try a different search or stock level." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Book inventory, lowest stock first</caption>
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Book</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Current</th>
                <th scope="col" className="px-4 py-3">Set new stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <StockRow key={b.id} book={b} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StockRow({ book }: { book: Book }) {
  const { setStock } = useStore();
  const [value, setValue] = useState(String(book.stock));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const level = stockLevel(book.stock);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseStockInput(value);
    if (!parsed.ok) return setMsg({ ok: false, text: parsed.error });
    if (parsed.value === book.stock) return setMsg({ ok: false, text: "No change to save." });
    setBusy(true);
    const result = await setStock(book.id, parsed.value);
    setBusy(false);
    setMsg(result.ok ? { ok: true, text: `Saved: ${book.stock} → ${parsed.value}` } : { ok: false, text: result.error });
  }

  return (
    <tr className={level === "out" ? "bg-red-50/50" : level === "low" ? "bg-amber-50/50" : ""}>
      <td className="px-4 py-3">
        <Link href={`/books/${book.id}`} className="font-medium hover:text-brand-700">{book.title}</Link>
        <p className="text-xs text-muted">{book.author}</p>
      </td>
      <td className="px-4 py-3 text-muted">{book.category}</td>
      <td className="px-4 py-3"><StockBadge stock={book.stock} /></td>
      <td className="px-4 py-3 text-base font-bold">{book.stock}</td>
      <td className="px-4 py-3">
        <form onSubmit={save} className="flex items-center gap-2" noValidate>
          <label htmlFor={`stock-${book.id}`} className="sr-only">New stock for {book.title}</label>
          <input
            id={`stock-${book.id}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="input w-24"
            value={value}
            aria-invalid={!!msg && !msg.ok}
            onChange={(e) => {
              setValue(e.target.value);
              setMsg(null);
            }}
          />
          <button type="submit" className="btn-primary btn-sm" disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </form>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`mt-1 text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}
      </td>
    </tr>
  );
}

function FulfilmentList() {
  const { orders, advanceOrderStatus } = useStore();
  const [showDelivered, setShowDelivered] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const list = orders.filter((o) => showDelivered || o.status !== "delivered");

  async function advance(id: string, orderNumber: string) {
    setBusyId(id);
    const result = await advanceOrderStatus(id);
    setBusyId(null);
    setFeedback(
      result.ok
        ? { ok: true, text: `Order ${orderNumber} is now "${STATUS_LABELS[result.value.status]}". The customer's tracking page shows the update.` }
        : { ok: false, text: result.error },
    );
  }

  return (
    <section aria-label="Order fulfilment">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Move each order to its next internal status. This simulates fulfilment; no courier is contacted.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showDelivered} onChange={(e) => setShowDelivered(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Show delivered orders
        </label>
      </div>
      {feedback && <Alert tone={feedback.ok ? "success" : "error"} className="mb-4">{feedback.text}</Alert>}
      {list.length === 0 ? (
        <EmptyState title="No open orders" message="All orders are delivered. New orders will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((o) => {
            const next = nextStatus(o.status);
            return (
              <article key={o.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="text-xs text-muted">
                      {o.customerName} · {o.city} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {o.items.map((i) => (
                    <li key={i.bookId} className="flex justify-between gap-2">
                      <span className="truncate">{i.title}</span>
                      <span className="shrink-0 text-muted">× {i.quantity}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link href={`/orders/${o.id}`} className="text-sm font-medium text-brand-700 hover:underline">View details</Link>
                  {next ? (
                    <button type="button" className="btn-accent btn-sm" disabled={busyId === o.id} onClick={() => advance(o.id, o.orderNumber)}>
                      {busyId === o.id ? "Updating..." : `Mark as ${STATUS_LABELS[next]}`}
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-emerald-700">Completed ✓</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

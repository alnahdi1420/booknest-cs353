"use client";

import Link from "next/link";
import type { OrderStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/core/orders";
import { STOCK_LABELS, stockLevel } from "@/lib/core/inventory";

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${styles} ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl" aria-hidden>
        📚
      </div>
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {message && <p className="mt-2 max-w-md text-sm text-muted">{message}</p>}
      {action && (
        <Link href={action.href} className="btn-primary mt-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StockBadge({ stock, showCount = false }: { stock: number; showCount?: boolean }) {
  const level = stockLevel(stock);
  const styles = {
    out: "bg-red-50 text-red-700 ring-red-200",
    low: "bg-amber-50 text-amber-800 ring-amber-200",
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[level];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STOCK_LABELS[level]}
      {showCount && level !== "out" ? ` (${stock})` : ""}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    placed: "bg-slate-100 text-slate-700 ring-slate-200",
    processing: "bg-amber-50 text-amber-800 ring-amber-200",
    shipped: "bg-sky-50 text-sky-800 ring-sky-200",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

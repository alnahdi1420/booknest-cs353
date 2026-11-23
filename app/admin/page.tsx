"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/components/providers/store-context";
import { RoleGuard } from "@/components/RoleGuard";
import { Alert, EmptyState, PageHeader, StatusBadge, formatDate } from "@/components/ui";
import { computeSalesStats } from "@/lib/core/reports";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/core/orders";
import { formatSAR } from "@/lib/core/money";
import { ROLES, ROLE_LABELS, type Profile, type Role } from "@/lib/types";

export default function AdminPage() {
  return (
    <div className="container-page py-10">
      <RoleGuard area="admin">
        <AdminDashboard />
      </RoleGuard>
    </div>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState<"sales" | "users">("sales");
  return (
    <>
      <PageHeader title="Administrator dashboard" subtitle="Sales reports calculated from recorded orders, and user account roles." />
      <div className="mb-6 flex gap-2" role="tablist" aria-label="Admin sections">
        <button type="button" role="tab" aria-selected={tab === "sales"} className={tab === "sales" ? "btn-primary" : "btn-outline"} onClick={() => setTab("sales")}>
          Sales report
        </button>
        <button type="button" role="tab" aria-selected={tab === "users"} className={tab === "users" ? "btn-primary" : "btn-outline"} onClick={() => setTab("users")}>
          User accounts
        </button>
      </div>
      {tab === "sales" ? <SalesReport /> : <UserAccounts />}
    </>
  );
}

function SalesReport() {
  const { orders } = useStore();
  const stats = useMemo(() => computeSalesStats(orders), [orders]);
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));
  const maxTop = Math.max(1, ...stats.topBooks.map((t) => t.quantity));

  if (orders.length === 0) return <EmptyState title="No orders yet" message="Sales metrics will appear after the first order is placed." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Total orders" value={String(stats.totalOrders)} />
        <Metric label="Total order value" value={formatSAR(stats.totalValue)} hint="Incl. simulated delivery fees" />
        <Metric label="Books sold" value={String(stats.booksSold)} />
        <Metric label="Average order" value={formatSAR(stats.averageOrderValue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="status-heading">
          <h2 id="status-heading" className="font-serif text-xl font-semibold">Orders by status</h2>
          <ul className="mt-5 space-y-4">
            {ORDER_STATUSES.map((s) => (
              <li key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{STATUS_LABELS[s]}</span>
                  <span className="font-semibold">{stats.byStatus[s]}</span>
                </div>
                <div className="h-2.5 rounded-full bg-paper" aria-hidden>
                  <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${(stats.byStatus[s] / maxStatus) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6" aria-labelledby="top-heading">
          <h2 id="top-heading" className="font-serif text-xl font-semibold">Top-selling books</h2>
          <ol className="mt-5 space-y-4">
            {stats.topBooks.map((t, i) => (
              <li key={t.bookId}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="truncate"><span className="mr-2 font-bold text-muted">{i + 1}.</span>{t.title}</span>
                  <span className="shrink-0 font-semibold">{t.quantity} sold · {formatSAR(t.revenue)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-paper" aria-hidden>
                  <div className="h-2.5 rounded-full bg-accent-500" style={{ width: `${(t.quantity / maxTop) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card overflow-x-auto" aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="px-6 pt-6 font-serif text-xl font-semibold">All orders</h2>
        <table className="mt-4 w-full min-w-[600px] text-left text-sm">
          <thead className="border-y border-line bg-paper text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-6 py-3">Order</th>
              <th scope="col" className="px-6 py-3">Customer</th>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">Total</th>
              <th scope="col" className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-6 py-3 font-semibold"><Link href={`/orders/${o.id}`} className="hover:text-brand-700">{o.orderNumber}</Link></td>
                <td className="px-6 py-3">{o.customerName}</td>
                <td className="px-6 py-3 text-muted">{formatDate(o.createdAt)}</td>
                <td className="px-6 py-3">{formatSAR(o.total)}</td>
                <td className="px-6 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function UserAccounts() {
  const { profiles, user, mode } = useStore();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <section aria-label="User accounts">
      <Alert tone="info" className="mb-4">
        Account management is deliberately limited to <strong>viewing users and changing roles</strong>. Administrators
        cannot change their own role. {mode === "supabase" && "Role changes are checked by the database (set_user_role), not only by this page."}
      </Alert>
      {feedback && <Alert tone={feedback.ok ? "success" : "error"} className="mb-4">{feedback.text}</Alert>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">User accounts and roles</caption>
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Joined</th>
              <th scope="col" className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {profiles.map((p) => (
              <UserRow key={p.id} profile={p} isSelf={p.id === user?.id} onResult={setFeedback} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserRow({ profile, isSelf, onResult }: { profile: Profile; isSelf: boolean; onResult: (f: { ok: boolean; text: string }) => void }) {
  const { setUserRole } = useStore();
  const [busy, setBusy] = useState(false);

  async function change(role: Role) {
    if (role === profile.role) return;
    if (!window.confirm(`Change ${profile.fullName}'s role from ${ROLE_LABELS[profile.role]} to ${ROLE_LABELS[role]}?`)) return;
    setBusy(true);
    const result = await setUserRole(profile.id, role);
    setBusy(false);
    onResult(result.ok ? { ok: true, text: `${profile.fullName} is now ${ROLE_LABELS[role]}.` } : { ok: false, text: result.error });
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium">
        {profile.fullName} {isSelf && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">You</span>}
      </td>
      <td className="px-4 py-3 text-muted">{profile.email}</td>
      <td className="px-4 py-3 text-muted">{formatDate(profile.createdAt)}</td>
      <td className="px-4 py-3">
        <label htmlFor={`role-${profile.id}`} className="sr-only">Role for {profile.fullName}</label>
        <select
          id={`role-${profile.id}`}
          className="input w-52 py-1.5"
          value={profile.role}
          disabled={isSelf || busy}
          title={isSelf ? "You cannot change your own role" : undefined}
          onChange={(e) => change(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}

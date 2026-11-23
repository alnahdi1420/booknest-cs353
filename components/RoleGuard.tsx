"use client";

import Link from "next/link";
import { useStore } from "./providers/store-context";
import { canAccess, type Area } from "@/lib/core/access";
import { ROLE_LABELS } from "@/lib/types";
import { Alert, Spinner } from "./ui";
import { PersonaSwitcher } from "./PersonaSwitcher";

const AREA_NAMES: Record<Area, string> = {
  account: "your account",
  warehouse: "the warehouse dashboard",
  admin: "the administrator dashboard",
};

/**
 * Client-side route check. It runs on direct URL visits too (not just hidden links).
 * In Supabase Mode, proxy.ts also checks the role on the server, and the database
 * (RLS + SQL role checks) is the final authority on what data can be read or changed.
 */
export function RoleGuard({ area, children }: { area: Area; children: React.ReactNode }) {
  const { ready, user, mode, loadError } = useStore();

  if (!ready) return <Spinner />;
  if (loadError) return <Alert tone="error">Could not load data: {loadError}</Alert>;

  if (!user) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="font-serif text-2xl font-semibold">Please sign in</h1>
        <p className="mt-2 text-sm text-muted">You need to be signed in to open {AREA_NAMES[area]}.</p>
        <Link href="/login" className="btn-primary mt-6">
          {mode === "demo" ? "Choose a demo persona" : "Sign in"}
        </Link>
      </div>
    );
  }

  if (!canAccess(user.role, area)) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl" aria-hidden>
          🔒
        </div>
        <h1 className="font-serif text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted">
          You are signed in as a <strong>{ROLE_LABELS[user.role]}</strong>. This page is only for{" "}
          {area === "admin" ? "administrators" : "warehouse managers and administrators"}.
        </p>
        {mode === "demo" && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-muted">Demo Mode: switch persona to try this page.</p>
            <PersonaSwitcher compact />
          </div>
        )}
        <Link href="/" className="btn-outline mt-6">
          Back to home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

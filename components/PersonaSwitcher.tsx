"use client";

import { useStore } from "./providers/store-context";
import { DEMO_PERSONAS, DEMO_USERS } from "@/lib/demo/seed";
import { ROLE_LABELS } from "@/lib/types";

const PERSONA_ROLE_LABEL: Record<string, string> = {
  "demo-customer": "Customer",
  "demo-warehouse": "Warehouse",
  "demo-admin": "Admin",
};

/** Demo Mode only: switch between the three sample personas (simulation, not real login). */
export function PersonaSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, user, switchPersona } = useStore();
  if (mode !== "demo" || !switchPersona) return null;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className={compact ? "sr-only" : "hidden text-muted xl:inline"}>Demo persona:</span>
      <select
        aria-label="Switch demo persona"
        className="max-w-[230px] rounded-full border border-line bg-white py-1.5 pl-3 pr-8 text-sm font-medium shadow-xs focus:border-brand-500"
        value={user && PERSONA_ROLE_LABEL[user.id] ? user.id : ""}
        onChange={(e) => e.target.value && switchPersona(e.target.value)}
      >
        {(!user || !PERSONA_ROLE_LABEL[user.id]) && <option value="">Choose persona...</option>}
        {DEMO_PERSONAS.map((p) => {
          const name = DEMO_USERS.find((u) => u.id === p.userId)?.fullName.split(" ")[0];
          return (
            <option key={p.userId} value={p.userId}>
              {PERSONA_ROLE_LABEL[p.userId]} ({name})
            </option>
          );
        })}
      </select>
      {user && (
        <span className="hidden whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 xl:inline">
          {ROLE_LABELS[user.role]}
        </span>
      )}
    </label>
  );
}

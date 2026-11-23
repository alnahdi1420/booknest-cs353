"use client";

import { useState } from "react";
import { useStore } from "./providers/store-context";
import { ROLE_LABELS } from "@/lib/types";

/** Always-visible notice in Demo Mode, with the Reset Demo Data control. */
export function DemoBanner() {
  const { mode, resetDemo, user } = useStore();
  const [done, setDone] = useState(false);
  if (mode !== "demo") return null;

  function handleReset() {
    if (!window.confirm("Reset all demo data? Books, stock, carts, orders and roles will go back to the original sample data.")) return;
    resetDemo?.();
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div className="bg-accent-100 text-amber-950">
      <div className="container-page flex flex-col gap-2 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p>
          <strong className="mr-1 rounded bg-amber-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-50">
            Demo Mode
          </strong>
          Educational sample data stored only in this browser. Simulated checkout: no payments, no real delivery.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/70 px-3 py-1" aria-live="polite">
            Active persona:{" "}
            <strong>{user ? `${user.fullName} · ${ROLE_LABELS[user.role]}` : "none"}</strong>
          </span>
          <button type="button" onClick={handleReset} className="rounded-full border border-amber-800/30 bg-white/70 px-3 py-1 font-semibold hover:bg-white">
            {done ? "Demo data reset ✓" : "Reset Demo Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

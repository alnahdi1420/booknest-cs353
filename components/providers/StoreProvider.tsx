"use client";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DemoStoreProvider } from "./DemoStoreProvider";
import { SupabaseStoreProvider } from "./SupabaseStoreProvider";

/** Chooses the data source: Supabase when configured, otherwise browser-only Demo Mode. */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) return <SupabaseStoreProvider>{children}</SupabaseStoreProvider>;
  return <DemoStoreProvider>{children}</DemoStoreProvider>;
}

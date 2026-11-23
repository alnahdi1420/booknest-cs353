"use client";

import { createContext, useContext } from "react";
import type { StoreValue } from "@/lib/data/types";

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside <StoreProvider>.");
  return value;
}

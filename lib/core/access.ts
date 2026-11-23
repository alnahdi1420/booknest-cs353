import type { Role } from "@/lib/types";

/** Protected areas of the site. */
export type Area = "account" | "warehouse" | "admin";

/**
 * Permission matrix. Used by route guards (UI + server proxy) and by Demo Mode actions.
 * In Supabase Mode the database enforces the same rules with RLS and role checks in SQL functions.
 */
const AREA_ROLES: Record<Area, Role[]> = {
  account: ["customer", "warehouse_manager", "admin"],
  warehouse: ["warehouse_manager", "admin"],
  admin: ["admin"],
};

export function canAccess(role: Role | null | undefined, area: Area): boolean {
  if (!role) return false;
  return AREA_ROLES[area].includes(role);
}

/** Stock changes and order-status updates: warehouse managers and admins. */
export function canManageInventory(role: Role | null | undefined): boolean {
  return role === "warehouse_manager" || role === "admin";
}

/** Only administrators may change roles, and never their own role (prevents lock-out). */
export function canChangeRole(actorRole: Role | null | undefined, actorId: string, targetId: string): boolean {
  return actorRole === "admin" && actorId !== targetId;
}

/** Maps a URL path to the protected area it belongs to (null = public). */
export function areaForPath(pathname: string): Area | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/warehouse" || pathname.startsWith("/warehouse/")) return "warehouse";
  if (pathname.startsWith("/orders") || pathname.startsWith("/checkout")) return "account";
  return null;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { areaForPath, canAccess } from "@/lib/core/access";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import type { Role } from "@/lib/types";

/**
 * Server-side route protection (Supabase Mode only).
 * - Refreshes the Supabase session cookie.
 * - /orders and /checkout need a signed-in user.
 * - /warehouse needs role warehouse_manager or admin; /admin needs role admin.
 *   The role is read from the database (profiles table), not from anything the browser sends.
 * Demo Mode has no server session (data is in localStorage), so the client RoleGuard is used there.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const area = areaForPath(request.nextUrl.pathname);
  if (!area) return response;

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (area !== "account") {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!canAccess((data?.role as Role | undefined) ?? null, area)) {
      return NextResponse.redirect(new URL("/?denied=1", request.url));
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

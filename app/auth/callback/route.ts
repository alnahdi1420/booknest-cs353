import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase Mode: the email-confirmation link redirects here with ?code=...
 * We exchange the code for a session cookie, then send the user to the catalog.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (isSupabaseConfigured() && code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
  }
  return NextResponse.redirect(new URL("/books", url.origin));
}

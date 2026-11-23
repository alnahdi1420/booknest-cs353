// Supabase Mode is enabled only when BOTH public variables are set.
// Otherwise the site runs in Demo Mode. Only the public anon/publishable key is used;
// the service-role key must never be added to this project.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;
}

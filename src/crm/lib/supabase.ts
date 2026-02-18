import { createBrowserClient } from "@supabase/ssr";

// Re-use the same cookie-backed Supabase client that Phoxta's main app uses.
// This ensures the CRM shares the authenticated session instead of creating
// an isolated instance that has no session.
export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

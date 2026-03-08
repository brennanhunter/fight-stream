import { createClient } from '@supabase/supabase-js';

// Server-side client (uses service role key — full access, bypasses RLS)
// Use this in API routes and server components
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, key);
}

// Client-side client (uses anon key — respects RLS)
// Use this in client components
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, key);
}

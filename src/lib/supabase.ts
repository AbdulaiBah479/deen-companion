// Supabase connection for the browser (React components). It uses only the public "anon" key; what each person may see is
// enforced by the database's row-level security rules (see supabase/schema.sql).
// The all-powerful service-role connection lives in supabase-admin.ts and is server-only.

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

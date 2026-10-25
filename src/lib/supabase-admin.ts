// The Supabase "service role" connection: it can read and delete ANY account, so it must only ever run on the server.
// The first line makes the build fail if a browser component ever imports this file by mistake.
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
}

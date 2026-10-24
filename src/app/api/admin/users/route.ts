import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase'

// GET    /api/admin/users          -> account count and the newest accounts (needs the Supabase service key)
// DELETE /api/admin/users?id=<id>  -> delete an account and its saved progress
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ configured: false })
  try {
    const sb = createAdminClient()
    const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 50 })
    if (error) throw error
    const total = (data as { total?: number }).total ?? data.users.length
    return NextResponse.json({
      configured: true,
      total,
      users: data.users
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .map((u) => ({ id: u.id, email: u.email ?? '', name: (u.user_metadata as { name?: string } | undefined)?.name ?? '', created: u.created_at, lastSignIn: u.last_sign_in_at ?? null, confirmed: !!u.email_confirmed_at })),
    })
  } catch (e) {
    return NextResponse.json({ configured: true, error: e instanceof Error ? e.message.slice(0, 160) : 'Could not read accounts' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const id = request.nextUrl.searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message.slice(0, 160) : 'Could not delete' }, { status: 502 })
  }
}

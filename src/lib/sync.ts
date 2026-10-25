'use client'

// Cross-device sync of the user's progress via Supabase (table `user_data`, see supabase/schema.sql).
// Active only when Supabase env vars are set AND the user is signed in; otherwise the app stays fully local.

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CHANGED_EVENT, PULLED_EVENT, TS_KEY, readTimestamps } from './storage'
import { isSyncKey, planSync, snapshotLocal, type RemoteRow } from './sync-core'

export type SyncState = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error'
export type SyncStatus = { state: SyncState; email?: string; lastSync?: number; message?: string }

let status: SyncStatus = { state: 'off' }
const listeners = new Set<(s: SyncStatus) => void>()
function setStatus(next: SyncStatus) {
  status = next
  listeners.forEach((l) => l(status))
}
export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState<SyncStatus>(status)
  useEffect(() => {
    listeners.add(setS)
    setS(status)
    return () => {
      listeners.delete(setS)
    }
  }, [])
  return s
}

export const supabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function fetchRemote(sb: SupabaseClient): Promise<RemoteRow[]> {
  const { data, error } = await sb.from('user_data').select('key,value,updated_at')
  if (error) throw error
  return (data ?? []).map((r: { key: string; value: unknown; updated_at: string }) => ({
    key: r.key,
    value: r.value,
    updatedAt: Date.parse(r.updated_at),
  }))
}

async function pushRemote(sb: SupabaseClient, userId: string, rows: RemoteRow[]) {
  if (!rows.length) return
  const { error } = await sb.from('user_data').upsert(
    rows.map((r) => ({ user_id: userId, key: r.key, value: r.value, updated_at: new Date(r.updatedAt).toISOString() })),
    { onConflict: 'user_id,key' }
  )
  if (error) throw error
}

async function fullSync(sb: SupabaseClient, userId: string) {
  const remote = await fetchRemote(sb)
  const ts = readTimestamps()
  const plan = planSync(snapshotLocal(localStorage, ts), remote)

  if (plan.pull.length) {
    for (const r of plan.pull) {
      localStorage.setItem(r.key, JSON.stringify(r.value))
      ts[r.key] = r.updatedAt
    }
    localStorage.setItem(TS_KEY, JSON.stringify(ts))
    window.dispatchEvent(new CustomEvent(PULLED_EVENT, { detail: { keys: plan.pull.map((r) => r.key) } }))
  }
  await pushRemote(sb, userId, plan.push)
}

let started = false
// Call once from the app shell. Safe to call repeatedly.
export function startSync() {
  if (started || typeof window === 'undefined') return
  if (!supabaseConfigured()) return
  started = true

  // The Supabase library is large, so it is only downloaded when sync is actually configured.
  const begin = (sb: SupabaseClient) => {
  let userId: string | null = null
  let timer: number | undefined
  const dirty = new Set<string>()

  const run = async () => {
    if (!userId) return
    setStatus({ ...status, state: 'syncing' })
    try {
      await fullSync(sb, userId)
      setStatus({ state: 'synced', email: status.email, lastSync: Date.now() })
    } catch (e) {
      setStatus({ state: 'error', email: status.email, message: e instanceof Error ? e.message : 'Sync failed' })
    }
  }

  const flush = async () => {
    if (!userId || !dirty.size) return
    const keys = [...dirty]
    dirty.clear()
    try {
      const ts = readTimestamps()
      const rows: RemoteRow[] = []
      for (const key of keys) {
        const raw = localStorage.getItem(key)
        if (raw === null) continue
        rows.push({ key, value: JSON.parse(raw), updatedAt: ts[key] ?? Date.now() })
      }
      await pushRemote(sb, userId, rows)
      setStatus({ state: 'synced', email: status.email, lastSync: Date.now() })
    } catch (e) {
      keys.forEach((k) => dirty.add(k))
      setStatus({ state: 'error', email: status.email, message: e instanceof Error ? e.message : 'Sync failed' })
    }
  }

  window.addEventListener(CHANGED_EVENT, (e) => {
    const key = (e as CustomEvent<{ key: string }>).detail?.key
    if (!userId || !key || !isSyncKey(key)) return
    dirty.add(key)
    window.clearTimeout(timer)
    timer = window.setTimeout(flush, 1500)
  })

  const apply = (session: { user: { id: string; email?: string } } | null) => {
    if (session) {
      userId = session.user.id
      setStatus({ state: 'syncing', email: session.user.email })
      run()
    } else {
      userId = null
      setStatus({ state: 'signed-out' })
    }
  }
  sb.auth.getSession().then(({ data }) => apply(data.session))
  sb.auth.onAuthStateChange((_event, session) => apply(session))
  }
  void import('./supabase').then(({ createClient }) => begin(createClient()))
}

export async function signOut() {
  if (!supabaseConfigured()) return
  const { createClient } = await import('./supabase')
  await createClient().auth.signOut()
}

// Deletes the signed-in person's own account and the progress saved online. Data on this phone is left alone.
export async function deleteMyAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured()) return { ok: false, error: 'Accounts are not switched on here.' }
  const { createClient } = await import('./supabase')
  const sb = createClient()
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, error: 'Please sign in first.' }
  const res = await fetch('/api/account/delete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: body.error || 'Could not delete the account.' }
  await sb.auth.signOut().catch(() => {})
  return { ok: true }
}

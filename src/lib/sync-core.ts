// Pure sync logic (no network, no DOM) so it can be unit-tested.
//
// Model: every synced localStorage key has a "last modified" timestamp (ms). The server stores the same.
// Rule: the newer side wins, per key. Keys with no local timestamp (data created before first sync) are treated
// as older than anything on the server, so a server copy wins; if the server has nothing, local is pushed.

export const SYNC_PREFIX = 'deen:'
// Device-specific or internal keys that must not be synced.
export const SYNC_EXCLUDE = new Set(['deen:_ts', 'deen:notify', 'deen:coords', 'deen:place'])

export const isSyncKey = (key: string) => key.startsWith(SYNC_PREFIX) && !SYNC_EXCLUDE.has(key)

export type RemoteRow = { key: string; value: unknown; updatedAt: number }
export type LocalEntry = { value: unknown; ts: number }
export type SyncPlan = {
  pull: RemoteRow[] // write these into local storage
  push: RemoteRow[] // upsert these on the server
}

export function planSync(local: Record<string, LocalEntry>, remote: RemoteRow[]): SyncPlan {
  const remoteByKey = new Map(remote.map((r) => [r.key, r]))
  const pull: RemoteRow[] = []
  const push: RemoteRow[] = []

  for (const r of remote) {
    if (!isSyncKey(r.key)) continue
    const l = local[r.key]
    if (!l || r.updatedAt > l.ts) pull.push(r)
  }
  for (const [key, l] of Object.entries(local)) {
    if (!isSyncKey(key)) continue
    const r = remoteByKey.get(key)
    if (!r) push.push({ key, value: l.value, updatedAt: l.ts || Date.now() })
    else if (l.ts > r.updatedAt) push.push({ key, value: l.value, updatedAt: l.ts })
  }
  return { pull, push }
}

// Reads all syncable keys (with timestamps) from a storage-like object.
export function snapshotLocal(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'>,
  timestamps: Record<string, number>
): Record<string, LocalEntry> {
  const out: Record<string, LocalEntry> = {}
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !isSyncKey(key)) continue
    const raw = storage.getItem(key)
    if (raw === null) continue
    try {
      out[key] = { value: JSON.parse(raw), ts: timestamps[key] ?? 0 }
    } catch {}
  }
  return out
}

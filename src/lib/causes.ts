// Server side of the zakat "where it can go" list. Stored as one JSON list in the free Redis; until the owner customises it,
// the starter list from causes-shared.ts is shown.

import { DEFAULT_CAUSES, parseCause, type Cause } from './causes-shared'
import { redis, redisConfigured } from './redis'

export { DEFAULT_CAUSES, parseCause, type Cause }
const KEY = 'site:causes'
const MAX_CAUSES = 40

export async function readCauses(): Promise<{ customized: boolean; causes: Cause[] }> {
  if (!redisConfigured()) return { customized: false, causes: DEFAULT_CAUSES }
  try {
    const [raw] = (await redis([['GET', KEY]])) as [string | null]
    if (!raw) return { customized: false, causes: DEFAULT_CAUSES }
    const parsed = (JSON.parse(raw) as unknown[]).map(parseCause).filter((c): c is Cause => !!c)
    return { customized: true, causes: parsed }
  } catch {
    return { customized: false, causes: DEFAULT_CAUSES }
  }
}

async function write(list: Cause[]): Promise<void> {
  await redis([['SET', KEY, JSON.stringify(list.slice(0, MAX_CAUSES))]])
}

// Copies the starter list into the store so it can be edited.
export async function customize(): Promise<void> {
  const cur = await readCauses()
  if (!cur.customized) await write(DEFAULT_CAUSES)
}

export async function upsertCause(c: Cause): Promise<void> {
  const cur = await readCauses()
  const list = cur.causes.some((x) => x.id === c.id) ? cur.causes.map((x) => (x.id === c.id ? c : x)) : [...cur.causes, c]
  await write(list)
}

export async function removeCause(id: string): Promise<void> {
  const cur = await readCauses()
  await write(cur.causes.filter((x) => x.id !== id))
}

export async function resetCauses(): Promise<void> {
  await redis([['DEL', KEY]])
}

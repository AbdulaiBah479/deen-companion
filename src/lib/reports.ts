// "Report a problem": visitors tell the owner about a mistake in the content, a wrong prayer time, a bug or an idea.
// Reports are kept in the same free Redis, newest first, and shown in the control room. Nothing identifying is collected
// unless the visitor chooses to leave a way to reach them.

import { randomBytes } from 'node:crypto'
import { redis, redisConfigured } from './redis'

import { REPORT_CATEGORIES, type Report, type ReportStatus } from './reports-shared'
export { REPORT_CATEGORIES, REPORT_STATUSES, isUrgent, type Report, type ReportCategory, type ReportStatus } from './reports-shared'

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(CONTROL, '').trim().slice(0, max) : '')

export function parseReport(body: unknown): Omit<Report, 'id' | 'at' | 'status'> | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const category = REPORT_CATEGORIES.find((c) => c.id === b.category)?.id
  const message = clean(b.message, 1500)
  if (!category || message.length < 10) return null
  const pageRaw = clean(b.page, 200)
  const page = pageRaw.startsWith('/') && !pageRaw.startsWith('//') ? pageRaw.split('#')[0] : ''
  const ref = clean(b.ref, 120)
  const contact = clean(b.contact, 120)
  return { category, message, page, ...(ref ? { ref } : {}), ...(contact ? { contact } : {}) }
}

const KEY = 'ops:reports'
const MAX = 500

export async function saveReport(r: Omit<Report, 'id' | 'at' | 'status'>): Promise<Report> {
  const full: Report = { id: randomBytes(5).toString('hex'), at: Date.now(), status: 'open', ...r }
  if (!redisConfigured()) throw new Error('Reports need the shared store (Redis)')
  await redis([['LPUSH', KEY, JSON.stringify(full)], ['LTRIM', KEY, 0, MAX - 1]])
  return full
}

export async function listReports(n = 100): Promise<Report[]> {
  if (!redisConfigured()) return []
  const [rows] = (await redis([['LRANGE', KEY, 0, n - 1]])) as [string[] | null]
  return (rows ?? []).flatMap((r) => {
    try {
      return [JSON.parse(r) as Report]
    } catch {
      return []
    }
  })
}

// Lists are awkward to edit in place, so rewrite the (small) list.
async function rewrite(update: (all: Report[]) => Report[]): Promise<boolean> {
  const all = await listReports(MAX)
  const next = update(all)
  if (JSON.stringify(next) === JSON.stringify(all)) return false
  await redis([['DEL', KEY], ...(next.length ? [['RPUSH', KEY, ...next.map((r) => JSON.stringify(r))]] : [])])
  return true
}

export const setReportStatus = (id: string, status: ReportStatus) => rewrite((all) => all.map((r) => (r.id === id ? { ...r, status } : r)))
export const deleteReport = (id: string) => rewrite((all) => all.filter((r) => r.id !== id))

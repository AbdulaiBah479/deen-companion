// Telling the owner when something needs attention: a notification on their phone (the same free Web Push the prayer
// reminders use), plus an optional chat webhook (Discord, Slack, Telegram bridges…) set as ALERT_WEBHOOK_URL.

import { addIncident, type Level } from './ops'
import { allowedEndpoint, pushConfigured, sendTo, subId, type PushSub } from './push'
import { redis, redisConfigured } from './redis'
import { webhookInit } from './webhook-format'

const b64url = /^[A-Za-z0-9_-]+={0,2}$/

export function parseAdminSub(body: unknown): PushSub | null {
  const b = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  if (!b || typeof b.endpoint !== 'string' || b.endpoint.length > 600 || !allowedEndpoint(b.endpoint)) return null
  const p256dh = b.keys?.p256dh
  const auth = b.keys?.auth
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 200 || auth.length > 100 || !b64url.test(p256dh) || !b64url.test(auth)) return null
  return { endpoint: b.endpoint, keys: { p256dh, auth } }
}

export async function saveAdminDevice(sub: PushSub): Promise<void> {
  const id = subId(sub.endpoint)
  await redis([
    ['SET', `admin:sub:${id}`, JSON.stringify(sub), 'EX', 60 * 60 * 24 * 90],
    ['SADD', 'admin:push', id],
  ])
}

export async function adminDeviceCount(): Promise<number> {
  if (!redisConfigured()) return 0
  try {
    const [n] = (await redis([['SCARD', 'admin:push']])) as [number]
    return Number(n) || 0
  } catch {
    return 0
  }
}

const ICON: Record<Level, string> = { info: 'ℹ️', warn: '⚠️', critical: '🚨' }

// Sends one alert everywhere it can. Never throws; returns how many channels were reached.
export async function sendAlert(level: Level, title: string, body: string, opts: { log?: boolean; component?: string } = {}): Promise<{ push: number; webhook: boolean }> {
  const out = { push: 0, webhook: false }
  if (opts.log !== false) await addIncident({ level, component: opts.component ?? 'alert', message: `${title} — ${body}` })

  if (pushConfigured()) {
    try {
      const [ids] = (await redis([['SMEMBERS', 'admin:push']])) as [string[]]
      for (const id of ids ?? []) {
        const [raw] = (await redis([['GET', `admin:sub:${id}`]])) as [string | null]
        if (!raw) {
          await redis([['SREM', 'admin:push', id]]).catch(() => {})
          continue
        }
        const sub = JSON.parse(raw) as PushSub
        const result = await sendTo({ sub } as never, { title: `${ICON[level]} ${title}`, body, url: '/admin', tag: `ops-${opts.component ?? 'alert'}` })
        if (result === 'sent') out.push++
        else if (result === 'gone') await redis([['SREM', 'admin:push', id], ['DEL', `admin:sub:${id}`]]).catch(() => {})
      }
    } catch {}
  }

  const hook = process.env.ALERT_WEBHOOK_URL || process.env.ERROR_WEBHOOK_URL
  if (hook) {
    const text = `${ICON[level]} Deen Companion — ${title}\n${body}`
    try {
      const init = webhookInit(hook, level, title, text)
      const r = await fetch(hook, { method: 'POST', headers: init.headers, body: init.body, signal: AbortSignal.timeout(5000) })
      out.webhook = r.ok
    } catch {}
  }
  return out
}

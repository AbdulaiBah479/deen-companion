import { NextRequest, NextResponse } from 'next/server'
import { adminDeviceCount } from '@/lib/alerts'
import { aiPerformance, aiStatus, configuredProviders } from '@/lib/ai'
import { requireAdmin } from '@/lib/admin-guard'
import { readCounters, readIncidents, readProviderStats, readStatuses, readTopErrors, readDiscoveredModels } from '@/lib/ops'
import { SCHEDULER_STALE_MIN, lastRunAgeMin, pushConfigured } from '@/lib/push'
import { redis, redisConfigured } from '@/lib/redis'

// GET /api/admin/overview — everything the admin page shows, in one request. Admin only. Contains no secrets, only names and numbers.
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied

  const env = process.env
  const set = (k: string) => !!env[k]
  const [statuses, incidents, counters, errors, provStats, models, devices] = await Promise.all([readStatuses(), readIncidents(25), readCounters(7), readTopErrors(8), readProviderStats(), readDiscoveredModels(), adminDeviceCount()])

  let reminderDevices: number | null = null
  if (redisConfigured()) {
    try {
      reminderDevices = Number(((await redis([['SCARD', 'push:ids']])) as [number])[0]) || 0
    } catch {}
  }

  // The owner's own to-do list, worked out from the live set-up, so it is always up to date.
  let schedulerAge: number | null = null
  try {
    if (redisConfigured()) schedulerAge = await lastRunAgeMin()
  } catch {}
  let confirmEmail: boolean | null = null // is "Confirm email" switched on in Supabase? (public setting; null = cannot tell)
  if (set('NEXT_PUBLIC_SUPABASE_URL') && set('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    try {
      const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, signal: AbortSignal.timeout(5000), cache: 'no-store' })
      if (r.ok) confirmEmail = (await r.json()).mailer_autoconfirm === false
    } catch {}
  }
  const providers = configuredProviders().length
  const todo = [
    { id: 'scheduler', done: schedulerAge !== null && schedulerAge <= SCHEDULER_STALE_MIN, title: 'Prayer reminders run on schedule', how: 'On GitHub: repo Settings → Secrets and variables → Actions. Add APP_URL (https://deen-companion-six.vercel.app) and CRON_SECRET (the value from .env.vercel), then Actions → Prayer reminders → Run workflow.' },
    { id: 'confirm-email', done: confirmEmail === true, unknown: confirmEmail === null, title: 'Sign-ups must confirm their e-mail', how: 'Supabase → Authentication → SMTP Settings (add a free Resend or Brevo sender), then Authentication → Sign In / Providers → Email → switch Confirm email on.' },
    { id: 'alerts', done: devices > 0 || set('ALERT_WEBHOOK_URL') || set('ERROR_WEBHOOK_URL'), title: 'You get alerts on your phone when something breaks', how: 'In the Alerts box on this page, press Turn on alerts on your phone (install the app first on iPhone).' },
    { id: 'ai', done: providers >= 3, title: 'At least three AI services are set up (so one outage never stops the AI)', how: 'Add more free keys in Vercel → Settings → Environment Variables (Gemini, Groq, Mistral, OpenRouter, GitHub Models…). Optional: OLLAMA_API_KEY + OLLAMA_MODEL, or OMNIROUTE_BASE_URL + OMNIROUTE_API_KEY + OMNIROUTE_MODEL.' },
    { id: 'site-url', done: set('NEXT_PUBLIC_SITE_URL'), title: 'The site address is set (for share links and search engines)', how: 'Vercel → Environment Variables: NEXT_PUBLIC_SITE_URL = https://deen-companion-six.vercel.app (or your own domain).' },
    { id: 'contact', done: set('NEXT_PUBLIC_OPERATOR_NAME') && set('NEXT_PUBLIC_CONTACT_EMAIL'), title: 'Your name and contact e-mail are on the privacy page', how: 'Vercel → Environment Variables: NEXT_PUBLIC_OPERATOR_NAME and NEXT_PUBLIC_CONTACT_EMAIL.' },
    { id: 'pexels', done: set('PEXELS_API_KEY'), title: 'Reels have video backgrounds', how: 'Free key at pexels.com/api, then add PEXELS_API_KEY in Vercel.' },
  ]

  const ai = aiStatus()
  const perf = aiPerformance()
  return NextResponse.json(
    {
      time: new Date().toISOString(),
      statuses,
      incidents,
      counters,
      errors,
      ai: {
        configured: configuredProviders().length,
        cachedAnswers: ai.cachedAnswers,
        providers: ai.providers.map((p) => ({ name: p.name, available: p.available, retryInSeconds: Math.ceil(p.retryInMs / 1000), reason: p.kind, session: perf[p.name] ?? null, history: provStats[p.name] ?? null })),
        discoveredModels: models,
      },
      todo,
      reminders: { configured: pushConfigured(), devices: reminderDevices, adminDevices: devices },
      config: {
        'AI keys': ['GEMINI_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY', 'OPENROUTER_API_KEY', 'GITHUB_MODELS_TOKEN', 'HF_TOKEN', 'SAMBANOVA_API_KEY', 'NVIDIA_API_KEY', 'CEREBRAS_API_KEY'].filter(set).length,
        'Shared store (Redis)': redisConfigured(),
        'Accounts (Supabase)': set('NEXT_PUBLIC_SUPABASE_URL') && set('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
        'Account admin (service key)': set('SUPABASE_SERVICE_ROLE_KEY'),
        'Prayer reminders (VAPID)': set('VAPID_PUBLIC_KEY') && set('VAPID_PRIVATE_KEY'),
        'Scheduler secret': (env.CRON_SECRET ?? '').length >= 16,
        'Alert webhook': set('ALERT_WEBHOOK_URL') || set('ERROR_WEBHOOK_URL'),
        'Reels videos (Pexels)': set('PEXELS_API_KEY'),
        'Site address': set('NEXT_PUBLIC_SITE_URL'),
        'Operator name and email': set('NEXT_PUBLIC_OPERATOR_NAME') && set('NEXT_PUBLIC_CONTACT_EMAIL'),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

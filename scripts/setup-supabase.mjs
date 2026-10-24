// Switches accounts on, end to end, with one command:
//   SUPABASE_ACCESS_TOKEN=sbp_…  VERCEL_TOKEN=…  node scripts/setup-supabase.mjs  https://your-site.vercel.app
//
// What it does (all on the free plan):
//   1. creates a Supabase project called "deen-companion" (or reuses one with that name),
//   2. waits until it is ready, then loads supabase/schema.sql (accounts, progress sync, privacy rules),
//   3. sets the sign-in options: your site address, instant sign-up (no confirmation email — see the note below),
//   4. reads the project's keys and saves them as environment variables in Vercel, so the live site picks them up.
// The keys are never printed in full. Run the deploy afterwards:  npx vercel deploy --prod
//
// Note on e-mail: Supabase's free built-in mailer can send only a couple of e-mails an hour, so asking every new user to
// confirm by e-mail would block sign-ups. This script therefore lets people in straight away. Once you connect a real mail
// service (Resend and Brevo have free plans) switch "Confirm email" back on in Supabase → Authentication → Providers → Email.

import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const SITE = (process.argv[2] || '').replace(/\/$/, '')
const SB = process.env.SUPABASE_ACCESS_TOKEN
const VERCEL = process.env.VERCEL_TOKEN
const REGION = process.env.SUPABASE_REGION || 'eu-central-1'
const VERCEL_PROJECT = process.env.VERCEL_PROJECT_ID || 'prj_Jj2vUxdCRk6Y8cuz3cJj9fKjKDj7'
const VERCEL_TEAM = process.env.VERCEL_TEAM_ID || 'team_fZP6ibqeejjdbOzstCuj7Q7g'
if (!SB || !SITE.startsWith('https://')) {
  console.error('Usage: SUPABASE_ACCESS_TOKEN=… [VERCEL_TOKEN=…] node scripts/setup-supabase.mjs https://your-site')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function api(path, init = {}) {
  const res = await fetch('https://api.supabase.com' + path, { ...init, headers: { Authorization: `Bearer ${SB}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 300)}`)
  return body
}
const mask = (s) => (s ? s.slice(0, 6) + '…' + s.slice(-4) : '(none)')

// 1. project
const projects = await api('/v1/projects')
let project = projects.find((p) => p.name === 'deen-companion')
if (project) console.log('Reusing the existing project', project.id)
else {
  const orgs = await api('/v1/organizations')
  if (!orgs.length) throw new Error('This Supabase account has no organisation yet. Open supabase.com/dashboard once, create one, then run this again.')
  const dbPass = randomBytes(24).toString('base64url') // kept only by Supabase; the app does not need it
  project = await api('/v1/projects', { method: 'POST', body: JSON.stringify({ name: 'deen-companion', organization_id: orgs[0].id, db_pass: dbPass, region: REGION, plan: 'free' }) })
  console.log('Created project', project.id, 'in', REGION)
}
const ref = project.id ?? project.ref

// 2. wait until ready
for (let i = 0; i < 60; i++) {
  const p = await api(`/v1/projects/${ref}`)
  if (p.status === 'ACTIVE_HEALTHY') break
  if (i === 59) throw new Error('The project is still starting. Wait a few minutes and run this again (it will reuse the project).')
  if (i % 3 === 0) console.log('…waiting for the project to start (' + p.status + ')')
  await sleep(10_000)
}

// 3. schema (skipped when already loaded)
const has = await api(`/v1/projects/${ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: "select to_regclass('public.user_data') as t" }) })
if (has?.[0]?.t) console.log('Schema already loaded')
else {
  await api(`/v1/projects/${ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8') }) })
  console.log('Schema loaded')
}

// 4. sign-in options
await api(`/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  body: JSON.stringify({ site_url: SITE, uri_allow_list: `${SITE}/**,http://localhost:3000/**`, mailer_autoconfirm: true, password_min_length: 8, disable_signup: false }),
})
console.log('Sign-in options set (site address, instant sign-up, 8+ character passwords)')

// 5. keys
const keys = await api(`/v1/projects/${ref}/api-keys`)
const anon = keys.find((k) => k.name === 'anon')?.api_key
const service = keys.find((k) => k.name === 'service_role')?.api_key
if (!anon || !service) throw new Error('Could not read the project keys')
const url = `https://${ref}.supabase.co`
console.log('URL', url, '| anon', mask(anon), '| service', mask(service))

// 6. save to Vercel
if (!VERCEL) {
  console.log('\nNo VERCEL_TOKEN given, so add these three in Vercel → Settings → Environment Variables yourself, then redeploy:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=' + url + '\nNEXT_PUBLIC_SUPABASE_ANON_KEY=' + anon + '\nSUPABASE_SERVICE_ROLE_KEY=' + service)
} else {
  const body = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: url, type: 'plain', target: ['production', 'preview', 'development'] },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: anon, type: 'plain', target: ['production', 'preview', 'development'] },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: service, type: 'sensitive', target: ['production', 'preview'] },
  ]
  const r = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env?teamId=${VERCEL_TEAM}&upsert=true`, { method: 'POST', headers: { Authorization: `Bearer ${VERCEL}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error('Vercel refused the keys: ' + (await r.text()).slice(0, 200))
  console.log('Saved to Vercel. Now deploy:  npx vercel deploy --prod')
}

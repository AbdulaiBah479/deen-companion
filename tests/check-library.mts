// Live check (needs internet; NOT part of `npm test`): every Library title must resolve to a real Wikipedia article.
// Run: npm run check:library      Goes slowly on purpose — Wikipedia refuses bursts.
import { HERITAGE } from '../src/lib/heritage.ts'
import { LIBRARY } from '../src/lib/library.ts'

const TITLES = [...new Set([...LIBRARY.map((e) => e.title), ...HERITAGE.map((h) => h.wiki)])]

const UA = { 'User-Agent': 'DeenCompanion/0.1 (open-source Islamic app)' }
const bad: string[] = []
const moved: string[] = []

for (const title of TITLES) {
  let status = 0
  let d: { type?: string; title?: string; extract?: string } = {}
  for (let k = 0; k < 4; k++) {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`, { headers: UA })
    const txt = await r.text()
    try {
      d = JSON.parse(txt)
      status = r.status
      break
    } catch {
      await new Promise((z) => setTimeout(z, 4000 * (k + 1)))
    }
  }
  if (status !== 200 || d.type !== 'standard' || (d.extract || '').length < 80) bad.push(`${title}  (${status || 'no answer'} ${d.type ?? ''})`)
  else if (d.title !== title) moved.push(`${title} -> ${d.title}`)
  await new Promise((z) => setTimeout(z, 300))
}

console.log(`${TITLES.length - bad.length}/${TITLES.length} titles resolve`)
if (moved.length) console.log('redirected (fine):\n  ' + moved.join('\n  '))
if (bad.length) console.log('PROBLEMS:\n  ' + bad.join('\n  '))
process.exit(bad.length ? 1 : 0)

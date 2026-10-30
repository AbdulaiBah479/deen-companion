// Tests how alerts are formatted for chat webhooks and ntfy.  Run: npm run test:webhook
import { isNtfy, webhookInit } from '../src/lib/webhook-format.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

ok('ntfy: ntfy.sh addresses are recognised (and look-alikes are not)', isNtfy('https://ntfy.sh/my-topic') && isNtfy('https://www.ntfy.sh/x') && !isNtfy('https://evil-ntfy.sh.example.com/x') && !isNtfy('https://example.com/ntfy.sh') && !isNtfy('not a url'))
const n = webhookInit('https://ntfy.sh/deen-alerts', 'critical', '🚨 AI companion is down', '🚨 Deen Companion — AI is down')
ok('ntfy: sends plain text with a clean ASCII title, top priority for critical', n.headers['Content-Type'].startsWith('text/plain') && n.headers.Priority === '5' && /^Deen Companion: /.test(n.headers.Title) && !/[^\x20-\x7E]/.test(n.headers.Title) && n.body.includes('AI is down'))
ok('ntfy: warnings and info get lower priorities', webhookInit('https://ntfy.sh/x', 'warn', 't', 'b').headers.Priority === '4' && webhookInit('https://ntfy.sh/x', 'info', 't', 'b').headers.Priority === '3')
const d = webhookInit('https://discord.com/api/webhooks/1/abc', 'warn', 'T', 'hello')
ok('other webhooks still get JSON with both "content" and "text"', d.headers['Content-Type'] === 'application/json' && JSON.parse(d.body).content === 'hello' && JSON.parse(d.body).text === 'hello')
ok('an empty title falls back to the app name', webhookInit('https://ntfy.sh/x', 'info', '🚨', 'b').headers.Title === 'Deen Companion: Deen Companion')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

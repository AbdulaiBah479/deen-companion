// Checks the scheduler secrets (rotation without a gap), the notification checkup's findings, and the health-check piggyback.
// Run: npm run test:opsfix
import { bearerMatches, cronSecrets } from '../src/lib/cron-auth.ts'
import { allGood, diagnose, type Facts } from '../src/lib/push-check.ts'
import { MIN_GAP_MIN, runAutopilotIfDue } from '../src/lib/autopilot.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ── secrets ──
const A = 'current-secret-0123456789'
const B = 'next-secret-9876543210-xyz'
ok('only strong secrets are used (16+ characters), both slots', cronSecrets({ CRON_SECRET: A, CRON_SECRET_NEXT: B }).length === 2 && cronSecrets({ CRON_SECRET: 'short' }).length === 0 && cronSecrets({}).length === 0 && cronSecrets({ CRON_SECRET_NEXT: B }).length === 1)
ok('the current secret is accepted', bearerMatches(`Bearer ${A}`, [A, B]))
ok('the next secret is accepted too, so the timer can be switched over without a gap', bearerMatches(`Bearer ${B}`, [A, B]))
ok('a wrong, truncated, extended or missing header is refused', !bearerMatches(`Bearer ${A}x`, [A, B]) && !bearerMatches(`Bearer ${A.slice(0, -1)}`, [A, B]) && !bearerMatches(A, [A, B]) && !bearerMatches('', [A, B]) && !bearerMatches(null, [A, B]) && !bearerMatches(undefined, [A, B]))
ok('with no secret set, nothing is accepted', !bearerMatches(`Bearer ${A}`, []) && !bearerMatches('Bearer ', []))
ok('after the swap the old secret stops working', !bearerMatches(`Bearer ${A}`, [B]) && bearerMatches(`Bearer ${B}`, [B]))

// ── notification checkup ──
const good: Facts = { secure: true, hasSW: true, hasPush: true, hasNotification: true, permission: 'granted', ios: false, standalone: false, subscribed: true, serverKnows: true, serverPrayers: 5, schedulerOk: true, locationSaved: true }
const ids = (f: Partial<Facts>) => diagnose({ ...good, ...f }).map((x) => x.id)
const levelOf = (f: Partial<Facts>, id: string) => diagnose({ ...good, ...f }).find((x) => x.id === id)?.level
ok('everything fine: all green, and says so', allGood(diagnose(good)) && ids({}).includes('server-ok') && ids({}).includes('timer-ok'))
ok('iPhone in Safari (not installed) is told to add the app to the Home Screen, and nothing else is asked', (() => { const r = diagnose({ ...good, ios: true, standalone: false, hasPush: false }); return r.length === 1 && r[0].id === 'ios-install' && /Home Screen/.test(r[0].fix!) })())
ok('iPhone with the Home Screen app is checked normally and gets iPhone advice', ids({ ios: true, standalone: true }).includes('ios-note') && !ids({ ios: true, standalone: true }).includes('ios-install'))
ok('a browser without push support is told so', ids({ hasPush: false }).join() === 'unsupported' && ids({ hasSW: false }).join() === 'unsupported')
ok('notifications blocked: tells how to unblock', (() => { const r = diagnose({ ...good, permission: 'denied' }); return r.length === 1 && r[0].id === 'blocked' && r[0].level === 'bad' && /Allow/.test(r[0].fix!) })())
ok('not yet asked: tells to switch reminders on', ids({ permission: 'default' }).join() === 'ask')
ok('allowed but not signed up in this browser', ids({ subscribed: false }).includes('not-subscribed') && levelOf({ subscribed: false }, 'not-subscribed') === 'bad')
ok('the server forgot this device: a clear fault with a fix', levelOf({ serverKnows: false }, 'server-missing') === 'bad' && !allGood(diagnose({ ...good, serverKnows: false })))
ok('server could not be asked: a warning, not a fault', levelOf({ serverKnows: null }, 'server-unknown') === 'warn')
ok('no saved place is flagged (times depend on it)', ids({ locationSaved: false }).includes('no-place'))
ok('the reminder timer being down is reported as the app’s fault, not the phone’s', levelOf({ schedulerOk: false }, 'timer') === 'bad' && /not your phone|app’s side/.test(diagnose({ ...good, schedulerOk: false }).find((x) => x.id === 'timer')!.fix!))
ok('Android gets the battery advice', ids({}).includes('android-note'))
ok('an insecure page is flagged first', diagnose({ ...good, secure: false })[0].id === 'https')
ok('every finding that is not OK says what to do', [{ permission: 'denied' }, { permission: 'default' }, { subscribed: false }, { serverKnows: false }, { serverKnows: null }, { locationSaved: false }, { schedulerOk: false }, { hasPush: false }, { ios: true, standalone: false }].every((f) => diagnose({ ...good, ...(f as Partial<Facts>) }).filter((x) => x.level !== 'ok').every((x) => !!x.fix)))

// ── the automatic jobs get only the access they need ──
import { readFileSync as read, readdirSync as list } from 'node:fs'
const WF = new URL('../.github/workflows/', import.meta.url)
const flows = list(WF).filter((f) => f.endsWith('.yml'))
const text = (f: string) => read(new URL(f, WF), 'utf8')
ok('every GitHub workflow declares its permissions (read-only for the code)', flows.length >= 5 && flows.every((f) => text(f).includes('permissions:') && text(f).includes('contents: read')), flows.filter((f) => !text(f).includes('contents: read')).join())
ok('no workflow is triggered by a stranger’s pull request with secrets (no pull_request_target)', flows.every((f) => !text(f).includes('pull_request_target')))
ok('secrets are passed to workflow steps as environment variables, never pasted into commands', flows.every((f) => !text(f).split(/\r?\n/).some((l) => l.includes('run:') && l.includes('secrets.'))))

// ── health-check piggyback ──
ok('health checks are not started when there is no shared store (nothing to take a turn with)', await runAutopilotIfDue() === 'unavailable' && MIN_GAP_MIN >= 5 && MIN_GAP_MIN <= 10)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

// Tests the cross-device sync merge rules (pure logic).  Run: npm run test:sync
import { isSyncKey, planSync, snapshotLocal } from '../src/lib/sync-core.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const keys = (rows: { key: string }[]) => rows.map((r) => r.key).sort().join(',')

ok('syncs app keys', isSyncKey('deen:bookmarks'))
ok('does not sync internal timestamps', !isSyncKey('deen:_ts'))
ok('does not sync device-specific notify/coords/place', !isSyncKey('deen:notify') && !isSyncKey('deen:coords') && !isSyncKey('deen:place'))
ok('ignores non-app keys', !isSyncKey('other:thing') && !isSyncKey('theme'))

// 1. Brand-new device, server has data -> pull everything
let p = planSync({}, [{ key: 'deen:dhikr', value: { a: 5 }, updatedAt: 100 }, { key: 'deen:bookmarks', value: ['1:1'], updatedAt: 200 }])
ok('new device pulls all remote keys', keys(p.pull) === 'deen:bookmarks,deen:dhikr' && p.push.length === 0)

// 2. First sync ever, local data, empty server -> push all
p = planSync({ 'deen:dhikr': { value: { a: 1 }, ts: 0 }, 'deen:lang': { value: 'ur', ts: 50 } }, [])
ok('first sync pushes all local keys', keys(p.push) === 'deen:dhikr,deen:lang' && p.pull.length === 0)
ok('pushed row with no timestamp gets a real one', p.push.find((r) => r.key === 'deen:dhikr')!.updatedAt > 0)

// 3. Newer side wins per key
p = planSync(
  { 'deen:a': { value: 'local-new', ts: 300 }, 'deen:b': { value: 'local-old', ts: 100 }, 'deen:c': { value: 'same', ts: 200 } },
  [{ key: 'deen:a', value: 'remote-old', updatedAt: 200 }, { key: 'deen:b', value: 'remote-new', updatedAt: 250 }, { key: 'deen:c', value: 'same', updatedAt: 200 }]
)
ok('local newer -> push', keys(p.push) === 'deen:a')
ok('remote newer -> pull', keys(p.pull) === 'deen:b' && p.pull[0].value === 'remote-new')
ok('equal timestamps -> nothing', !keys(p.push).includes('deen:c') && !keys(p.pull).includes('deen:c'))

// 4. Pre-login local data (ts 0) vs. existing server copy -> server wins (documented rule)
p = planSync({ 'deen:hifz': { value: { x: 1 }, ts: 0 } }, [{ key: 'deen:hifz', value: { x: 9 }, updatedAt: 500 }])
ok('untimestamped local data loses to a server copy', keys(p.pull) === 'deen:hifz' && p.push.length === 0)

// 5. Excluded/foreign remote keys are never pulled
p = planSync({}, [{ key: 'deen:_ts', value: {}, updatedAt: 1 }, { key: 'evil:key', value: 1, updatedAt: 1 }, { key: 'deen:notify', value: true, updatedAt: 1 }])
ok('never pulls excluded or foreign keys from the server', p.pull.length === 0)

// 6. Idempotent: applying the plan then re-planning yields nothing
const local: Record<string, { value: unknown; ts: number }> = { 'deen:a': { value: 1, ts: 10 } }
const remote = [{ key: 'deen:b', value: 2, updatedAt: 20 }]
const plan = planSync(local, remote)
for (const r of plan.pull) local[r.key] = { value: r.value, ts: r.updatedAt }
for (const r of plan.push) remote.push({ key: r.key, value: r.value, updatedAt: r.updatedAt })
const again = planSync(local, remote)
ok('re-sync after applying plan is a no-op', again.pull.length === 0 && again.push.length === 0, `${again.pull.length}/${again.push.length}`)

// 7. Two devices converge
const devA: Record<string, { value: unknown; ts: number }> = { 'deen:streak': { value: 3, ts: 1000 } }
const devB: Record<string, { value: unknown; ts: number }> = { 'deen:streak': { value: 5, ts: 2000 } }
let server: { key: string; value: unknown; updatedAt: number }[] = []
const syncDevice = (d: typeof devA) => {
  const pl = planSync(d, server)
  for (const r of pl.pull) d[r.key] = { value: r.value, ts: r.updatedAt }
  for (const r of pl.push) { server = server.filter((s) => s.key !== r.key); server.push(r) }
}
syncDevice(devA); syncDevice(devB); syncDevice(devA)
ok('two devices converge to the newest value', devA['deen:streak'].value === 5 && devB['deen:streak'].value === 5)

// 8. snapshotLocal
const store = new Map<string, string>([['deen:x', '{"a":1}'], ['deen:bad', '{not json'], ['other', '1'], ['deen:_ts', '{}'], ['deen:y', '"s"']])
const fake = { get length() { return store.size }, key: (i: number) => [...store.keys()][i] ?? null, getItem: (k: string) => store.get(k) ?? null }
const snap = snapshotLocal(fake, { 'deen:x': 77 })
ok('snapshot includes valid app keys with timestamps', snap['deen:x']?.ts === 77 && snap['deen:y']?.ts === 0)
ok('snapshot skips invalid JSON, foreign and internal keys', !('deen:bad' in snap) && !('other' in snap) && !('deen:_ts' in snap))

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)

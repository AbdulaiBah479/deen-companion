// Tests the recitation practice rules (repeat, pause, ranges).  Run: npm run test:playback
import { afterVerse, gapMs, rangeLabel, repeatLabel, type Plan } from '../src/lib/playback.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const plan = (p: Partial<Plan> = {}): Plan => ({ repeatEach: 1, pause: 'none', continuous: true, range: null, ...p })
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// ───────── ordinary listening ─────────
ok('normal: goes to the next verse', same(afterVerse(plan(), { surah: 2, ayah: 5, plays: 1, loopsDone: 0 }, 286), { kind: 'next', surah: 2, ayah: 6 }))
ok('normal: after the last verse it moves on to the next surah (continuous on)', same(afterVerse(plan(), { surah: 2, ayah: 286, plays: 1, loopsDone: 0 }, 286), { kind: 'next', surah: 3, ayah: 1 }))
ok('normal: with continuous off it stops at the end of the surah', same(afterVerse(plan({ continuous: false }), { surah: 2, ayah: 286, plays: 1, loopsDone: 0 }, 286), { kind: 'stop' }))
ok('normal: it stops at the very end of the Quran', same(afterVerse(plan(), { surah: 114, ayah: 6, plays: 1, loopsDone: 0 }, 6), { kind: 'stop' }))

// ───────── repeat each verse ─────────
ok('repeat 3×: the first two times it replays', same(afterVerse(plan({ repeatEach: 3 }), { surah: 1, ayah: 1, plays: 1, loopsDone: 0 }, 7), { kind: 'replay' }) && same(afterVerse(plan({ repeatEach: 3 }), { surah: 1, ayah: 1, plays: 2, loopsDone: 0 }, 7), { kind: 'replay' }))
ok('repeat 3×: after the third it moves on', same(afterVerse(plan({ repeatEach: 3 }), { surah: 1, ayah: 1, plays: 3, loopsDone: 0 }, 7), { kind: 'next', surah: 1, ayah: 2 }))
ok('repeat ∞: never moves on', same(afterVerse(plan({ repeatEach: 0 }), { surah: 1, ayah: 1, plays: 500, loopsDone: 0 }, 7), { kind: 'replay' }))
{
  // simulate a whole listening session: Al-Fatiha, each verse 2×, no continuous
  const p = plan({ repeatEach: 2, continuous: false })
  let pos = { surah: 1, ayah: 1, plays: 1, loopsDone: 0 }
  const heard: string[] = [`1:1`]
  for (let i = 0; i < 100; i++) {
    const s = afterVerse(p, pos, 7)
    if (s.kind === 'stop') break
    if (s.kind === 'replay') pos = { ...pos, plays: pos.plays + 1 }
    else pos = { surah: s.surah, ayah: s.ayah, plays: 1, loopsDone: pos.loopsDone }
    heard.push(`${pos.surah}:${pos.ayah}`)
  }
  ok('session: Al-Fatiha with each verse twice plays 14 verses in the right order', heard.length === 14 && heard.slice(0, 5).join() === '1:1,1:1,1:2,1:2,1:3' && heard.at(-1) === '1:7', heard.join(' '))
}

// ───────── a range, looped ─────────
{
  const r = { surah: 112, from: 1, to: 4, loops: 3 }
  const p = plan({ range: r, continuous: false })
  let pos = { surah: 112, ayah: 1, plays: 1, loopsDone: 0 }
  const heard: string[] = ['1']
  for (let i = 0; i < 100; i++) {
    const s = afterVerse(p, pos, 4)
    if (s.kind === 'stop') break
    if (s.kind === 'replay') pos = { ...pos, plays: pos.plays + 1 }
    else if (s.kind === 'restart') pos = { surah: s.surah, ayah: s.ayah, plays: 1, loopsDone: pos.loopsDone + 1 }
    else pos = { surah: s.surah, ayah: s.ayah, plays: 1, loopsDone: pos.loopsDone }
    heard.push(String(pos.ayah))
  }
  ok('range 112:1–4 ×3: plays the four verses three times and then stops', heard.join('') === '123412341234', heard.join(''))
  const never = afterVerse(plan({ range: { ...r, loops: 0 } }), { surah: 112, ayah: 4, plays: 1, loopsDone: 40 }, 4)
  ok('range ∞: keeps restarting', same(never, { kind: 'restart', surah: 112, ayah: 1 }))
  ok('range: stays inside the range even when the surah is longer', same(afterVerse(plan({ range: { surah: 2, from: 285, to: 286, loops: 1 } }), { surah: 2, ayah: 285, plays: 1, loopsDone: 0 }, 286), { kind: 'next', surah: 2, ayah: 286 }) && same(afterVerse(plan({ range: { surah: 2, from: 285, to: 286, loops: 1 } }), { surah: 2, ayah: 286, plays: 1, loopsDone: 0 }, 286), { kind: 'stop' }))
  ok('range + repeat: each verse repeats inside the range', same(afterVerse(plan({ range: { surah: 112, from: 1, to: 4, loops: 1 }, repeatEach: 2 }), { surah: 112, ayah: 2, plays: 1, loopsDone: 0 }, 4), { kind: 'replay' }))
}

// ───────── pauses ─────────
ok('pause: none is instant', gapMs('none', 6) === 0)
ok('pause: short is two seconds', gapMs('short', 6) === 2000)
ok('pause: "your turn" is a little longer than the verse, so you can say it too', gapMs('echo', 10) === 11000)
ok('pause: "your turn" has sensible limits for very short or very long verses', gapMs('echo', 0.4) === 1500 && gapMs('echo', 90) === 20000)
ok('pause: "your turn" works while the length is still unknown', gapMs('echo', NaN) === 4400 && gapMs('echo', Infinity) === 4400)

ok('labels', repeatLabel(0) === '∞' && repeatLabel(3) === '3×' && rangeLabel({ surah: 112, from: 1, to: 4, loops: 3 }) === '112:1–4 ×3' && rangeLabel({ surah: 2, from: 255, to: 255, loops: 1 }) === '2:255' && rangeLabel({ surah: 1, from: 1, to: 7, loops: 0 }) === '1:1–7 ∞')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

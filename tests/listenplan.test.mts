// Checks the "Listen plan" choices, and that the player's rules really play what the plan says.  Run: npm run test:listenplan
import { EACH_CHOICES, LOOP_CHOICES, MAX_PLANS, PRESETS, addPlan, cleanPlans, estimateMinutes, fixPlan, planLabel, removePlan, totalPlays } from '../src/lib/listen-plan.ts'
import { afterVerse, type Plan, type Pos } from '../src/lib/playback.ts'
import { getSurahs, getVerses } from '../src/lib/data.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const surahs = getSurahs()

// Keeping choices valid
ok('a plan is kept inside its surah (from <= to <= verses)', (() => { const p = fixPlan({ surah: 1, from: 5, to: 99 }, 7); return p.from === 5 && p.to === 7 })())
ok('"to" can never be before "from"', (() => { const p = fixPlan({ surah: 2, from: 50, to: 10 }, 286); return p.to >= p.from && p.from === 50 })())
ok('junk becomes a sensible default', (() => { const p = fixPlan({ surah: -4, from: NaN, to: 'x' as unknown as number, each: 4, loops: 99, pause: 'weird' as never }, 7); return p.surah === 1 && p.from === 1 && p.to === 7 && p.each === 1 && p.loops === 1 && p.pause === 'none' })())
ok('only the offered repeat counts are accepted', EACH_CHOICES.every((n) => fixPlan({ each: n }, 10).each === n) && LOOP_CHOICES.every((n) => fixPlan({ loops: n }, 10).loops === n))

// Totals and time
ok('total plays = verses × each × whole-part repeats', totalPlays({ from: 1, to: 7, each: 5, loops: 3 }) === 105)
ok('"until I stop" has no total or time', totalPlays({ from: 1, to: 7, each: 0, loops: 1 }) === null && totalPlays({ from: 1, to: 7, each: 1, loops: 0 }) === null && estimateMinutes({ from: 1, to: 7, each: 0, loops: 1 }) === null)
ok('time estimate is at least a minute and grows with the plan', estimateMinutes({ from: 1, to: 1, each: 1, loops: 1 }) === 1 && estimateMinutes({ from: 1, to: 7, each: 5, loops: 3 })! > 10)
ok('the label reads clearly', planLabel({ surah: 2, from: 255, to: 255, each: 1, loops: 3 }) === '2:255 · each verse 1× · whole 3×' && planLabel({ surah: 112, from: 1, to: 4, each: 0, loops: 0 }) === '112:1–4 · each verse ∞ · whole ∞')

// Saved plans
const p1 = fixPlan({ surah: 112, from: 1, to: 4, each: 1, loops: 3 }, 4)
let list = addPlan([], p1, 1000)
ok('a plan can be saved, once', list.length === 1 && addPlan(list, p1, 2000).length === 1)
list = addPlan(list, { ...p1, loops: 5 }, 3000)
ok('a different plan is added at the front', list.length === 2 && list[0].loops === 5)
ok('a plan can be removed', removePlan(list, list[0].id).length === 1)
ok('saved plans are repaired when read back', cleanPlans([{ id: 'a', surah: 2, from: 9999, to: 1 }, { nope: 1 }, null, 'x', { id: '', surah: 1 }]).length === 1 && cleanPlans('x').length === 0)
ok('the list is capped', (() => { let l: ReturnType<typeof addPlan> = []; for (let i = 1; i <= MAX_PLANS + 5; i++) l = addPlan(l, { ...p1, from: 1, to: 1, surah: ((i - 1) % 114) + 1, each: 2, loops: 2 }, i); return l.length <= MAX_PLANS })())

// The player's own rules do what the plan says
function simulate(p: { surah: number; from: number; to: number; each: number; loops: number }, versesInSurah: number) {
  const plan: Plan = { repeatEach: p.each, pause: 'none', continuous: false, range: { surah: p.surah, from: p.from, to: p.to, loops: p.loops } }
  const heard: number[] = []
  let pos: Pos = { surah: p.surah, ayah: p.from, plays: 1, loopsDone: 0 }
  for (let guard = 0; guard < 5000; guard++) {
    heard.push(pos.ayah)
    const s = afterVerse(plan, pos, versesInSurah)
    if (s.kind === 'stop') return heard
    if (s.kind === 'replay') pos = { ...pos, plays: pos.plays + 1 }
    else if (s.kind === 'next') pos = { ...pos, ayah: s.ayah, plays: 1 }
    else pos = { surah: s.surah, ayah: s.ayah, plays: 1, loopsDone: pos.loopsDone + 1 }
  }
  return heard
}
const h = simulate({ surah: 1, from: 2, to: 4, each: 2, loops: 3 }, 7)
ok('the player hears 3 verses × 2 each × 3 rounds = 18 recitations, in order', h.length === 18 && h.slice(0, 6).join() === '2,2,3,3,4,4' && h.slice(6, 12).join() === '2,2,3,3,4,4', h.join())
ok('a one-verse plan repeated 3 times plays that verse 3 times and stops', simulate({ surah: 2, from: 255, to: 255, each: 1, loops: 3 }, 286).join() === '255,255,255')
ok('the number the plan promises equals what the player plays', (() => { const q = { surah: 112, from: 1, to: 4, each: 3, loops: 2 }; return simulate(q, 4).length === totalPlays(q) })())

// Quick choices are real parts of the Quran
ok('every quick choice lies inside its surah', PRESETS.every((p) => { const s = surahs[p.surah - 1]; return !!s && p.from >= 1 && p.to <= s.verses_count && p.from <= p.to }), PRESETS.filter((p) => p.to > (surahs[p.surah - 1]?.verses_count ?? 0)).map((p) => p.title).join())
ok('Ayat al-Kursi is 2:255 and al-Ikhlas has 4 verses', PRESETS[0].surah === 2 && PRESETS[0].from === 255 && getVerses(2, 'en', 255, 255)[0].text_simple.includes('الحي القيوم') && surahs[111].verses_count === 4)
ok('the last two verses of al-Baqarah are 285 and 286 (the end of the surah)', PRESETS[1].from === 285 && PRESETS[1].to === 286 && surahs[1].verses_count === 286)
ok('al-Kahf has at least ten verses and al-Mulk has 30', surahs[17].verses_count >= 10 && surahs[66].verses_count === 30 && PRESETS.find((p) => p.title === 'Al-Mulk')!.to === 30)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

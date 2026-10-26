// Checks the rituals and baraka content against the app's real hadith and Quran data.  Run: npm run test:rituals
import { HABITS, AREAS } from '../src/lib/baraka.ts'
import { GROUPS, RITUALS, ritualById, type HadithPin } from '../src/lib/rituals.ts'
import { parseRef } from '../src/lib/khutbah.ts'
import { getLocalHadith, getVerses } from '../src/lib/data.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const pinProblems = (pins: HadithPin[], owner: string) => pins.flatMap((p) => {
  const t = getLocalHadith(p.book, p.number)
  return !t ? [`${owner}: ${p.book} ${p.number} missing`] : t.toLowerCase().includes(p.must.toLowerCase()) ? [] : [`${owner}: ${p.book} ${p.number} lacks "${p.must}" -> ${t.slice(0, 70)}`]
})
const quranProblems = (refs: string[] | undefined, owner: string) => (refs ?? []).flatMap((r) => {
  const q = parseRef(r)
  return q && getVerses(q.surah, 'en', q.from, q.to).length === q.to - q.from + 1 ? [] : [`${owner}: verse ${r} not found`]
})

// ───────── rituals ─────────
ok('rituals: at least 14, unique ids, every group used', RITUALS.length >= 14 && new Set(RITUALS.map((r) => r.id)).size === RITUALS.length && GROUPS.every((g) => RITUALS.some((r) => r.group === g)))
ok('rituals: each has a summary, a time, at least three steps and at least one hadith or verse', RITUALS.every((r) => r.summary.length > 40 && r.when.length > 15 && r.steps.length >= 3 && (r.hadith.length > 0 || (r.quran?.length ?? 0) > 0)))
ok('rituals: the ones people ask about are there (istikhara, rain, eclipse, funeral, Eid)', ['istikhara', 'istisqa', 'kusuf', 'janazah', 'eid'].every((id) => !!ritualById(id)))
const problems = RITUALS.flatMap((r) => [...pinProblems(r.hadith, r.id), ...quranProblems(r.quran, r.id)])
ok('rituals: every hadith exists in Bukhari/Muslim and contains its key word; every verse exists', problems.length === 0, problems.join('  |  '))
ok('rituals: the notes admit where the schools differ (at least eight rituals carry one)', RITUALS.filter((r) => (r.notes?.length ?? 0) > 0).length >= 8)

// ───────── baraka ─────────
ok('baraka: at least 15 habits across all five areas, unique ids', HABITS.length >= 15 && new Set(HABITS.map((h) => h.id)).size === HABITS.length && AREAS.every((a) => HABITS.some((h) => h.area === a)))
const bp = HABITS.flatMap((h) => [...pinProblems(h.hadith ?? [], h.id), ...quranProblems(h.quran, h.id)])
ok('baraka: every hadith and verse is real and says what the habit needs', bp.length === 0, bp.join('  |  '))
ok('baraka: every habit explains why and how, and has some evidence', HABITS.every((h) => h.why.length > 30 && h.how.length > 20 && ((h.hadith?.length ?? 0) + (h.quran?.length ?? 0)) > 0))
ok('baraka: nothing promises a guaranteed result or uses magical wording', !HABITS.some((h) => /guarantee|always works|magic|secret trick/i.test(h.why + h.how)))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

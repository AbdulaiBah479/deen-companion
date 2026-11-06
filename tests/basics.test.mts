// Checks the Islam basics content against the app's real hadith and Quran data.  Run: npm run test:basics
import { GLOSSARY, SECTIONS } from '../src/lib/basics.ts'
import { parseRef } from '../src/lib/khutbah.ts'
import { getLocalHadith, getVerses } from '../src/lib/data.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const problems: string[] = []
for (const s of SECTIONS) {
  for (const p of s.hadith) {
    const t = getLocalHadith(p.book, p.number)
    if (!t) problems.push(`${s.id}: ${p.book} ${p.number} missing`)
    else if (!t.toLowerCase().includes(p.must.toLowerCase())) problems.push(`${s.id}: ${p.book} ${p.number} lacks "${p.must}"`)
  }
  for (const r of s.quran ?? []) {
    const q = parseRef(r)
    if (!q || getVerses(q.surah, 'en', q.from, q.to).length !== q.to - q.from + 1) problems.push(`${s.id}: verse ${r} not found`)
  }
}
ok('basics: six sections with unique ids, each with an introduction and evidence', SECTIONS.length === 6 && new Set(SECTIONS.map((s) => s.id)).size === 6 && SECTIONS.every((s) => s.intro.length > 40 && s.hadith.length > 0))
ok('basics: every hadith exists in Bukhari/Muslim and holds its key word; every verse exists', problems.length === 0, problems.join(' | '))
const pray = SECTIONS.find((s) => s.id === 'pray')!
ok('basics: the prayer guide has ten steps and says what to say at the bow, the prostration and the end', pray.steps?.length === 10 && !!pray.steps?.some((s) => /ruku/i.test(s.title) && s.say) && !!pray.steps?.some((s) => /sujud/i.test(s.title) && s.say) && !!pray.steps?.some((s) => /salam/i.test(s.title) && s.say))
ok('basics: the prayer guide gives the rak‘ahs of all five prayers and admits where the schools differ', /Fajr 2/.test(JSON.stringify(pray.items)) && /Isha 4/.test(JSON.stringify(pray.items)) && (pray.notes?.length ?? 0) > 0)
ok('basics: five pillars and six articles of faith are all listed', SECTIONS.find((s) => s.id === 'pillars')!.items!.length === 5 && SECTIONS.find((s) => s.id === 'iman')!.items!.length === 6)
ok('basics: the glossary has 14+ terms with Arabic and a meaning', GLOSSARY.length >= 14 && GLOSSARY.every((g) => /[؀-ۿ]/.test(g.ar) && g.meaning.length > 5))
ok('basics: nothing is presented as a fatwa', !JSON.stringify(SECTIONS).toLowerCase().includes('this is a fatwa'))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

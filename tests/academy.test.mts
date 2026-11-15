// Checks the Academy courses: every lesson is complete, every quiz is answerable, the Arabic is voweled, and the catalogue is consistent.
// Run: npm run test:academy
import { ACADEMY_LESSONS, ACADEMY_PATHS } from '../src/lib/academy-content.ts'
import { COURSES, STATIC_ALL, courseById, lessonIds } from '../src/lib/courses.ts'
import { EMPTY_LEARN, completeLesson, pathProgress } from '../src/lib/learn.ts'
import { getSurahs } from '../src/lib/data.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

const all = Object.entries(ACADEMY_LESSONS).flatMap(([course, ls]) => ls.map((l) => ({ course, l })))
ok('five Academy courses, each with at least five lessons', Object.keys(ACADEMY_LESSONS).length === 5 && Object.values(ACADEMY_LESSONS).every((ls) => ls.length >= 5), Object.entries(ACADEMY_LESSONS).map(([k, v]) => `${k}:${v.length}`).join(' '))
ok('at least 35 Academy lessons', all.length >= 35, String(all.length))
const ids = all.map((x) => x.l.id)
ok('lesson ids are unique across all courses', new Set(ids).size === ids.length, ids.filter((x, i) => ids.indexOf(x) !== i).join())
ok('every lesson has a title, a summary and at least one slide with content', all.every(({ l }) => l.title && l.summary.length > 8 && l.slides.length >= 1 && l.slides.every((s) => (s.body && s.body.length > 8) || (s.bullets?.length ?? 0) > 0)))
ok('every lesson has a quiz of at least three questions', all.every(({ l }) => l.quiz.length >= 3), all.filter(({ l }) => l.quiz.length < 3).map(({ l }) => l.id).join())
const badQ = all.flatMap(({ l }) => l.quiz.map((q) => ({ l, q }))).filter(({ q }) => !q.options.includes(q.answer) || new Set(q.options).size !== q.options.length || q.options.length < 3 || q.options.length > 4)
ok('every question has its answer among 3–4 different options', badQ.length === 0, badQ.map(({ l, q }) => `${l.id}: ${q.prompt}`).slice(0, 3).join(' | '))
ok('no question gives the answer away in its prompt', all.flatMap(({ l }) => l.quiz).every((q) => !q.prompt.includes(q.answer) || q.answer.length < 3))

// Arabic: voweled wherever it is shown to be learned
const AR = /[ء-ي]/
const VOW = /[ً-ْ]/
const arabicLines = all.flatMap(({ l }) => l.slides.flatMap((s) => [s.arabic, ...(s.bullets ?? []).filter((b) => b.includes('  —  ')).map((b) => b.split('  —  ')[0])]).filter((x): x is string => !!x && AR.test(x)).map((x) => ({ id: l.id, x })))
const unvoweled = arabicLines.filter(({ x }) => x.replace(/[^ء-يً-ْ ]/g, '').split(' ').some((w) => w.length > 2 && AR.test(w) && !VOW.test(w)))
ok('Arabic vocabulary and examples carry their vowels', unvoweled.length === 0, unvoweled.slice(0, 3).map((u) => u.x).join(' | '))
ok('vocabulary lines have Arabic, a transliteration and a meaning', all.flatMap(({ l }) => l.slides.flatMap((s) => (s.bullets ?? []).filter((b) => b.includes('  —  ')))).every((b) => b.split('  —  ').length === 3 && b.split('  —  ').every((p) => p.trim().length > 0)))
ok('Arabic questions mark their Arabic text', all.flatMap(({ l }) => l.quiz).filter((q) => AR.test(q.answer) && !/[A-Za-z]/.test(q.answer)).every((q) => q.optionsArabic === true || /[ـ+]/.test(q.answer)))

// Catalogue
ok('every Academy course has a catalogue entry and lessons', ACADEMY_PATHS.every((p) => ACADEMY_LESSONS[p.id]?.length) && Object.keys(ACADEMY_LESSONS).every((k) => ACADEMY_PATHS.some((p) => p.id === k)))
ok('course ids are unique and all are found', new Set(COURSES.map((c) => c.id)).size === COURSES.length && COURSES.every((c) => courseById(c.id)))
ok('there are courses for children and for everyone', COURSES.some((c) => c.info.audience === 'kids') && COURSES.some((c) => c.info.audience === 'everyone') && COURSES.filter((c) => c.info.audience === 'kids').length >= 2)
ok('every course says what you will learn, its level and how long', COURSES.every((c) => c.info.learn.length >= 3 && c.info.minutes > 20 && ['Beginner', 'Intermediate'].includes(c.info.level)))
ok('lesson ids for static courses match the lessons', Object.keys(STATIC_ALL).every((k) => lessonIds(k).join() === STATIC_ALL[k].map((l) => l.id).join()))
ok('the original courses are still counted (letters and Quran words)', lessonIds('letters').length >= 7 && lessonIds('words').length === 40)

// Progress works for an Academy course end to end
let st = EMPTY_LEARN
for (const l of ACADEMY_LESSONS['quran-101']) st = completeLesson(st, l.id, 100, '2026-11-16').state
ok('completing every lesson of a course counts as finished', pathProgress(st, lessonIds('quran-101')) === lessonIds('quran-101').length && st.xp > 50)

// Facts that can be checked against the app's own data
const quran = getSurahs()
ok('the Quran has 114 surahs and 6,236 verses, as the lesson says', quran.length === 114 && quran.reduce((n, s) => n + s.verses_count, 0) === 6236)
ok('al-Baqarah (286) is the longest and al-Kawthar (3) the shortest, as the lesson says', quran[1].verses_count === 286 && quran[107].verses_count === 3 && Math.max(...quran.map((s) => s.verses_count)) === 286 && Math.min(...quran.map((s) => s.verses_count)) === 3)
ok('the five-pillars count in the children’s lesson is five', ACADEMY_LESSONS['kids-islam'].find((l) => l.id === 'ki-pillars')!.slides[0].bullets!.length === 5)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

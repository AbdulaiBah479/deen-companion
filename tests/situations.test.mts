// Tests the "What is on your heart?" dua finder.  Run: npm run test:situations
import { getVerses } from '../src/lib/data.ts'
import { SITUATIONS, findSituations } from '../src/lib/situations.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const ids = (t: string) => findSituations(t).map((s) => s.id)

// ───────── matching what a person writes ─────────
ok('match: "I feel anxious about my exam" finds anxiety and studying', ids('I feel anxious about my exam').includes('anxiety') && ids('I feel anxious about my exam').includes('knowledge'), ids('I feel anxious about my exam').join())
ok('match: debt and money', ids('I am in so much debt and cannot pay the rent')[0] === 'debt')
ok('match: "my mother is sick" finds parents and illness', ids('my mother is sick').includes('parents') && ids('my mother is sick').includes('illness'))
ok('match: anger', ids("I'm furious and can't control my temper")[0] === 'anger')
ok('match: different word forms (worried / worrying)', ids('I keep worrying').includes('anxiety') && ids('so worried lately').includes('anxiety'))
ok('match: guilt and regret lead to forgiveness', ids('I feel so guilty about what I did')[0] === 'forgiveness')
ok('match: a decision', ids("I can't decide whether to take the job in another city")[0] === 'decision' || ids("I can't decide whether to take the job in another city").includes('decision'))
ok('match: capital letters and punctuation do not matter', ids('SAD!!!').includes('anxiety') && ids('  sad  ').includes('anxiety'))
ok('match: nothing recognisable gives nothing (the page then offers the AI companion)', ids('xyzzy plugh').length === 0 && ids('').length === 0 && ids('   ').length === 0)
ok('match: at most three results, best first', findSituations('sad angry afraid in debt sick and confused about my exam').length === 3)
ok('match: short words only match whole words (so "ill" does not match inside "will" or "hill")', !ids('I will climb the hill').includes('illness'))
ok('match: "homework" is study, not family', ids('stuck on my homework').includes('knowledge') && !ids('stuck on my homework').includes('family'))

// ───────── the content itself ─────────
ok('content: ids are unique and every situation can be reached by at least one word', new Set(SITUATIONS.map((s) => s.id)).size === SITUATIONS.length && SITUATIONS.every((s) => s.feelings.length >= 3))
ok('content: every situation gives something to read: a verse, a dua, or the Ruqyah section', SITUATIONS.every((s) => s.quran.length + s.duas.length > 0 || s.ruqyah))
ok('content: every verse range really exists in the bundled Quran', SITUATIONS.flatMap((s) => s.quran).every((q) => getVerses(q.surah, 'en', q.from, q.to).length === q.to - q.from + 1))
ok('content: every dua has Arabic, a transliteration, a meaning and a hadith source', SITUATIONS.flatMap((s) => s.duas).every((d) => /[؀-ۿ]{4,}/.test(d.arabic) && d.transliteration.length > 8 && d.meaning.length > 10 && d.source.book === 'bukhari' && (d.source.number ?? 0) > 0))
ok('content: the hadith used are the ones checked against the bundled Bukhari', [...new Set(SITUATIONS.flatMap((s) => s.duas).map((d) => Number(d.source.number)))].sort((a, b) => a - b).join() === '832,3282,4563,6345,6369')
ok('content: the three situations that need care include no unverified claim — only sourced duas or Qur’an', SITUATIONS.filter((s) => ['anxiety', 'hardship', 'fear'].includes(s.id)).every((s) => s.duas.every((d) => d.source.book) && s.quran.length > 0))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

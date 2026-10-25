// Tests the AI companion's safety rules.  Run: npm run test:care
import { CARE_VERSES, SCHOLAR_NOTE, careLang, careText, followUps, needsCare, needsScholarNote, withScholarNote } from '../src/lib/care.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── a person in distress gets a caring reply, not an AI answer ─────────
const distress = [
  'I want to kill myself',
  'i feel like ending my life',
  "I don't want to live anymore",
  'I am thinking about suicide',
  'i want to die',
  'I keep thinking about hurting myself',
  'there is no reason to go on living, I want to end it all',
  'Is it haram for me to want to die?',
  'أريد أن أموت',
  'أفكر في الانتحار',
  "j'ai envie de mourir",
  'quiero morir',
  'aku ingin bunuh diri',
  'intihar etmek istiyorum',
  'ich will mich umbringen',
]
for (const m of distress) ok(`care: "${m}" gets the caring reply`, needsCare(m))

const ordinary = [
  'What is the ruling on suicide in Islam?',
  'Why do people commit suicide?',
  'Is suicide a major sin according to the hadith?',
  'What does the Quran say about patience?',
  'How do I perform wudu?',
  'Tell me about the Battle of Uhud',
  'What is the dua when someone dies?',
  'My grandmother died, what dua should I make for her?',
  'How can I kill the weeds in my garden?',
]
for (const m of ordinary) ok(`care: "${m}" is answered normally`, !needsCare(m))

ok('care: the reply points to emergency help, a trusted person, treatment and findahelpline.com', ['en', 'ar', 'fr', 'es', 'id', 'tr'].every((l) => careText(l).includes('findahelpline.com') && careText(l).length > 300))
ok('care: other languages fall back to the English text', careText('sw') === careText('en') && careText('xx') === careText('en'))
ok('care: the English reply never claims to be a professional or promises an outcome', !/I can help you with this|I am a (doctor|counsellor|therapist)|everything will be fine/i.test(careText('en')))
ok('care: four verses of hope are offered', CARE_VERSES.length === 4 && CARE_VERSES.some(([s, a]) => s === 39 && a === 53))

// ───────── personal rulings and health: a note to ask a scholar / doctor ─────────
for (const m of ['Is it halal to take a mortgage?', 'My husband gave me talaq, what now?', 'How is inheritance divided between sons and daughters?', 'Am I allowed to pray in my shoes?', 'What dose of paracetamol is safe?', 'Can I fast while pregnant?', 'Is bitcoin haram?']) {
  ok(`note: "${m}" gets the scholar/doctor note`, needsScholarNote(m))
}
for (const m of ['What does the Quran say about patience?', 'How do I perform wudu?', 'Tell me about Prophet Yusuf', 'Explain Quran 2:255']) {
  ok(`note: "${m}" does not`, !needsScholarNote(m))
}
const plain = 'The Prophet ﷺ taught that debts should be repaid [H1].'
ok('note: it is added once, at the end', withScholarNote('Is it halal to take a mortgage?', plain).endsWith(SCHOLAR_NOTE) && withScholarNote('Is it halal to take a mortgage?', plain).startsWith(plain))
ok('note: it is not added when the question does not need one', withScholarNote('How do I perform wudu?', plain) === plain)
const already = 'Scholars differ. This is general educational information, so please ask a qualified scholar about your own situation.'
ok('note: it is not repeated when the answer already says the same', withScholarNote('Is it halal to take a mortgage?', already) === already)

// ───────── which language the caring reply uses ─────────
ok('language: an Arabic message gets the Arabic reply even if the app is in English', careLang('أريد أن أموت', 'en') === 'ar')
ok('language: an Urdu message does not get the Arabic reply', careLang('میں مرنا چاہتا ہوں', 'ur') !== 'ar')
ok('language: otherwise the app language is used when there is text for it, else English', careLang('i want to die', 'fr') === 'fr' && careLang('i want to die', 'tr') === 'tr' && careLang('i want to die', 'sw') === 'en' && careLang('i want to die') === 'en')

// ───────── follow-up questions ─────────
const both = followUps([{ kind: 'quran', ref: '2:153' }, { kind: 'hadith', ref: 'Sahih al-Bukhari 1469' }])
ok('follow-ups: from a verse and a hadith, up to three useful questions', both.length === 3 && both[0] === 'Explain Quran 2:153' && both[1].includes('Sahih al-Bukhari 1469') && both[2] === 'Explain it more simply', both.join(' | '))
ok('follow-ups: with only a verse, it offers the scholars question too', followUps([{ kind: 'quran', ref: '2:153' }]).length === 3)
ok('follow-ups: with no sources there is still a "more simply" option', followUps([]).join() === 'Explain it more simply')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

// Course content for the Learn section.
//
// - Arabic letters and Quran words are generated (letters from a table, words from the frequency data).
// - Tajweed and Foundations are short, mainstream summaries. Every Quran/hadith reference below is checked against the
//   bundled data by tests/learn.test.mts, so an example can't silently point at the wrong verse.
// These are study aids, not a replacement for a teacher: details differ slightly between schools and recitations.

import { mulberry32, shuffle } from './random'

export type Slide = {
  title?: string
  arabic?: string
  big?: boolean // show the Arabic extra large
  transliteration?: string
  body?: string
  bullets?: string[]
  example?: { ar: string; ref: string } // ref like "112:1" — verified against the Quran text by tests
  audio?: string // URL of a recording (e.g. a single Quran word)
  speak?: string // Arabic text to read aloud with the device voice
  href?: string
}
export type Question = { prompt: string; promptArabic?: string; options: string[]; answer: string; optionsArabic?: boolean; explain?: string }
export type Lesson = { id: string; title: string; summary: string; slides: Slide[]; quiz: Question[]; words?: { id: string }[] }
export type PathMeta = { id: string; title: string; icon: string; blurb: string; color: string }

export const PATHS: PathMeta[] = [
  { id: 'letters', title: 'Arabic Letters', icon: 'أ', blurb: 'The 28 letters: names, sounds and how they join.', color: '#0F766E' },
  { id: 'words', title: 'Quran Words', icon: '📖', blurb: 'The most frequent words of the Quran, with pronunciation.', color: '#B45309' },
  { id: 'tajweed', title: 'Tajweed Basics', icon: '🎙', blurb: 'The core rules of beautiful, correct recitation.', color: '#7C3AED' },
  { id: 'basics', title: 'Foundations', icon: '🕌', blurb: 'Pillars, belief, wudu and the prayer.', color: '#0369A1' },
]

// ───────────────────────── helpers ─────────────────────────

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Builds a multiple-choice question with a fixed, reproducible option order.
export function mcq(id: string, prompt: string, answer: string, pool: string[], extra: Partial<Question> = {}): Question {
  const rand = mulberry32(hashString(id + prompt))
  const wrong = shuffle(
    [...new Set(pool)].filter((x) => x !== answer),
    rand
  ).slice(0, 3)
  return { prompt, answer, options: shuffle([answer, ...wrong], rand), ...extra }
}

// ───────────────────────── Arabic letters ─────────────────────────

export type Letter = { ch: string; name: string; sound: string; joins: boolean }

export const LETTERS: Letter[] = [
  { ch: 'ا', name: 'Alif', sound: 'a long “aa” sound (it also carries the hamza)', joins: false },
  { ch: 'ب', name: 'Baa', sound: '“b” as in bat', joins: true },
  { ch: 'ت', name: 'Taa', sound: '“t” as in tea', joins: true },
  { ch: 'ث', name: 'Thaa', sound: '“th” as in think', joins: true },
  { ch: 'ج', name: 'Jeem', sound: '“j” as in jam', joins: true },
  { ch: 'ح', name: 'Haa', sound: 'a deep, breathy “h” from the middle of the throat', joins: true },
  { ch: 'خ', name: 'Khaa', sound: 'like “ch” in Scottish “loch”', joins: true },
  { ch: 'د', name: 'Daal', sound: '“d” as in door', joins: false },
  { ch: 'ذ', name: 'Dhaal', sound: '“th” as in this', joins: false },
  { ch: 'ر', name: 'Raa', sound: 'a rolled “r”', joins: false },
  { ch: 'ز', name: 'Zaay', sound: '“z” as in zoo', joins: false },
  { ch: 'س', name: 'Seen', sound: '“s” as in sun', joins: true },
  { ch: 'ش', name: 'Sheen', sound: '“sh” as in ship', joins: true },
  { ch: 'ص', name: 'Saad', sound: 'a heavy, full “s”', joins: true },
  { ch: 'ض', name: 'Daad', sound: 'a heavy, full “d”', joins: true },
  { ch: 'ط', name: 'Taa (heavy)', sound: 'a heavy, full “t”', joins: true },
  { ch: 'ظ', name: 'Zaa (heavy)', sound: 'a heavy “th” as in this', joins: true },
  { ch: 'ع', name: '‘Ayn', sound: 'a voiced sound from deep in the throat (no English equivalent)', joins: true },
  { ch: 'غ', name: 'Ghayn', sound: 'a gargled sound, like the French “r”', joins: true },
  { ch: 'ف', name: 'Faa', sound: '“f” as in fan', joins: true },
  { ch: 'ق', name: 'Qaaf', sound: 'a deep “k” from the back of the throat', joins: true },
  { ch: 'ك', name: 'Kaaf', sound: '“k” as in kite', joins: true },
  { ch: 'ل', name: 'Laam', sound: '“l” as in lamp', joins: true },
  { ch: 'م', name: 'Meem', sound: '“m” as in moon', joins: true },
  { ch: 'ن', name: 'Noon', sound: '“n” as in nose', joins: true },
  { ch: 'ه', name: 'Haa (light)', sound: 'a light “h” as in hat', joins: true },
  { ch: 'و', name: 'Waaw', sound: '“w” as in water (or a long “oo”)', joins: false },
  { ch: 'ي', name: 'Yaa', sound: '“y” as in yes (or a long “ee”)', joins: true },
]

const ZWJ = '‍'
// The four written forms. Browsers shape these with joiners; right-joining-only letters have no initial/medial form.
export function letterForms(l: Letter) {
  return {
    isolated: l.ch,
    initial: l.joins ? l.ch + ZWJ : l.ch,
    medial: l.joins ? ZWJ + l.ch + ZWJ : ZWJ + l.ch,
    final: ZWJ + l.ch,
  }
}

export function buildLetterLessons(): Lesson[] {
  const lessons: Lesson[] = []
  const names = LETTERS.map((l) => l.name)
  const chars = LETTERS.map((l) => l.ch)
  for (let i = 0; i < LETTERS.length; i += 4) {
    const group = LETTERS.slice(i, i + 4)
    const n = i / 4 + 1
    const id = `letters-${n}`
    const slides: Slide[] = group.map((l) => {
      const f = letterForms(l)
      return {
        title: l.name,
        arabic: l.ch,
        big: true,
        transliteration: l.name,
        body: `Sounds like ${l.sound}.`,
        bullets: [
          `Alone: ${f.isolated}`,
          l.joins ? `Start of a word: ${f.initial}` : 'Does not join to the letter after it, so it looks the same at the start of a word.',
          l.joins ? `Middle: ${f.medial}` : `Joined to the letter before it: ${f.final}`,
          l.joins ? `End: ${f.final}` : 'Never connects forward — the next letter starts fresh.',
        ],
        speak: l.name === 'Alif' ? 'ألف' : undefined,
      }
    })
    const quiz: Question[] = []
    for (const l of group) {
      quiz.push(mcq(id, `Which letter is “${l.name}”?`, l.ch, chars, { optionsArabic: true }))
      quiz.push(mcq(id, 'What is this letter called?', l.name, names, { promptArabic: l.ch }))
    }
    quiz.push(mcq(id, `Which letter sounds like ${group[0].sound}?`, group[0].ch, chars, { optionsArabic: true }))
    lessons.push({
      id,
      title: `Letters ${i + 1}–${i + group.length}`,
      summary: group.map((l) => l.ch).join(' '),
      slides,
      quiz,
    })
  }
  return lessons
}

// ───────────────────────── Quran words ─────────────────────────

export type WordRow = { ar: string; tr: string; en: string; n: number; audio?: string; ex: string }
const WORDS_PER_LESSON = 10

// Same word list the lessons and the flashcard deck use: drops entries with no meaning and exact duplicates.
export function dedupeWords(rows: WordRow[]): WordRow[] {
  const seen = new Set<string>()
  return rows.filter((r) => {
    const k = wordId(r)
    if (!r.en || seen.has(k)) return false
    seen.add(k)
    return true
  })
}
export const wordId = (w: Pick<WordRow, 'ar' | 'en'>) => `${w.ar}|${w.en}`

export function buildWordLessons(rows: WordRow[], totalTokens: number): Lesson[] {
  const words = dedupeWords(rows)
  const meanings = [...new Set(words.map((w) => w.en))]
  const lessons: Lesson[] = []
  let cumulative = 0
  for (let i = 0; i < words.length; i += WORDS_PER_LESSON) {
    const group = words.slice(i, i + WORDS_PER_LESSON)
    const n = i / WORDS_PER_LESSON + 1
    const id = `words-${n}`
    cumulative += group.reduce((s, w) => s + w.n, 0)
    const pct = Math.round((cumulative / totalTokens) * 1000) / 10
    lessons.push({
      id,
      title: `Words ${i + 1}–${i + group.length}`,
      summary: `${group.map((w) => w.en).slice(0, 4).join(', ')}…  ·  words 1–${i + group.length} cover ${pct}% of the Quran’s words`,
      slides: group.map((w) => ({
        arabic: w.ar,
        big: true,
        transliteration: w.tr,
        body: `${w.en}`,
        bullets: [`Appears ${w.n.toLocaleString()} times in the Quran`, `Example: Quran ${w.ex}`],
        example: undefined,
        audio: w.audio ? `https://audio.qurancdn.com/${w.audio}` : undefined,
        href: `/quran/${w.ex.split(':')[0]}#v${w.ex.split(':')[1]}`,
      })),
      quiz: group.map((w) => mcq(id, 'What does this word mean?', w.en, meanings, { promptArabic: w.ar })),
      words: group.map((w) => ({ id: wordId(w) })),
    })
  }
  return lessons
}

// ───────────────────────── Tajweed ─────────────────────────

export const TAJWEED_LESSONS: Lesson[] = [
  {
    id: 'tajweed-noon',
    title: 'Noon Sakinah & Tanween',
    summary: 'Four rules decided by the letter that follows.',
    slides: [
      {
        title: 'The four rules',
        body: 'When a silent noon (نْ) or tanween (ً ٍ ٌ) is followed by a letter, how you pronounce it depends on that letter.',
        bullets: [
          'Izhar — clear: before the six throat letters ء ه ع ح غ خ',
          'Idgham — merging: before ي ر م ل و ن (remember: يرملون)',
          'Iqlab — switching: before ب',
          'Ikhfa — hiding: before the other 15 letters',
        ],
      },
      {
        title: 'Idgham: with or without ghunnah',
        body: 'Merging is with ghunnah (a nasal hum) before ي ن م و, and without ghunnah before ل ر.',
      },
      {
        title: 'Iqlab',
        body: 'Before ب the noon sound changes to a hidden “m” (م) with ghunnah, lips closed lightly.',
        example: { ar: 'مِنۢ بَعْدِ', ref: '2:27' },
      },
      {
        title: 'Ikhfa',
        body: 'The 15 letters are ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك. The noon is hidden between clear and merged, with ghunnah.',
      },
    ],
    quiz: [
      { prompt: 'A silent noon is followed by ع. Which rule applies?', options: ['Izhar', 'Idgham', 'Iqlab', 'Ikhfa'], answer: 'Izhar' },
      { prompt: 'A silent noon is followed by ب. Which rule applies?', options: ['Izhar', 'Idgham', 'Iqlab', 'Ikhfa'], answer: 'Iqlab' },
      { prompt: 'A silent noon is followed by ك. Which rule applies?', options: ['Izhar', 'Idgham', 'Iqlab', 'Ikhfa'], answer: 'Ikhfa' },
      { prompt: 'Idgham is WITHOUT ghunnah before which letters?', options: ['ل and ر', 'ي and و', 'م and ن', 'ب and ف'], answer: 'ل and ر' },
      { prompt: 'How many letters cause ikhfa?', options: ['6', '15', '4', '28'], answer: '15' },
    ],
  },
  {
    id: 'tajweed-ghunnah',
    title: 'Ghunnah',
    summary: 'The nasal hum on noon and meem.',
    slides: [
      {
        title: 'What is ghunnah?',
        body: 'A nasal sound held for about two counts. It is strongest on a noon (نّ) or meem (مّ) that carries a shaddah.',
        example: { ar: 'ثُمَّ يُمِيتُكُمْ', ref: '2:28' },
      },
      { title: 'Where to listen for it', body: 'In the app, turn on Tajweed colours in the reader: ghunnah is shown in orange.' },
    ],
    quiz: [
      { prompt: 'Ghunnah is strongest on a noon or meem that has…', options: ['a shaddah', 'a sukoon', 'a madd', 'no vowel'], answer: 'a shaddah' },
      { prompt: 'Roughly how long is ghunnah held?', options: ['2 counts', '6 counts', '1 count', 'It is not held'], answer: '2 counts' },
      { prompt: 'The nasal sound in ghunnah comes from the…', options: ['nose passage', 'lips only', 'throat only', 'tongue tip'], answer: 'nose passage' },
    ],
  },
  {
    id: 'tajweed-qalqalah',
    title: 'Qalqalah',
    summary: 'The echo on ق ط ب ج د.',
    slides: [
      {
        title: 'The echoing letters',
        body: 'When one of these five letters is silent (or you stop on it), release a slight bounce or echo. A common memory aid is “قُطْبُ جَدٍّ”.',
        bullets: ['ق  ط  ب  ج  د'],
        example: { ar: 'أَحَدٌ', ref: '112:1' },
      },
      { title: 'Another example', body: 'Stopping on the final ب of this verse gives a clear qalqalah.', example: { ar: 'وَتَبَّ', ref: '111:1' } },
    ],
    quiz: [
      { prompt: 'Which set are the qalqalah letters?', options: ['ق ط ب ج د', 'ء ه ع ح غ', 'ي ر م ل و', 'س ش ص ض'], answer: 'ق ط ب ج د' },
      { prompt: 'Qalqalah is a…', options: ['slight echo/bounce', 'long stretch', 'nasal hum', 'silent pause'], answer: 'slight echo/bounce' },
      { prompt: 'In Surah Al-Ikhlas 112:1, qalqalah is heard when stopping on…', options: ['د', 'ل', 'ه', 'ا'], answer: 'د' },
    ],
  },
  {
    id: 'tajweed-madd',
    title: 'Madd (Elongation)',
    summary: 'When and how long to stretch a vowel.',
    slides: [
      {
        title: 'The madd letters',
        body: 'Three letters stretch a vowel: alif after a fatha, waaw after a damma, yaa after a kasra. The natural madd lasts 2 counts.',
        bullets: ['Natural (asli): 2 counts', 'Connected (muttasil): madd letter then hamza in the same word — about 4–5 counts', 'Separated (munfasil): madd letter at the end of a word, hamza starts the next — about 4–5 counts in most Hafs teaching', 'Necessary (lazim): madd before a permanent sukoon/shaddah — 6 counts'],
        example: { ar: 'جَآءَكُم', ref: '2:87' },
      },
      {
        title: 'A separated madd',
        body: 'Counts for the longer madds vary slightly between recitation traditions; follow your teacher.',
        example: { ar: 'بِمَآ أُنزِلَ', ref: '2:4' },
      },
    ],
    quiz: [
      { prompt: 'How long is the natural (asli) madd?', options: ['2 counts', '4–5 counts', '6 counts', '1 count'], answer: '2 counts' },
      { prompt: 'The madd before a permanent sukoon or shaddah (lazim) is…', options: ['6 counts', '2 counts', '4–5 counts', 'not stretched'], answer: '6 counts' },
      { prompt: 'Which letter stretches a vowel after a kasra?', options: ['ي', 'و', 'ا', 'ل'], answer: 'ي' },
    ],
  },
  {
    id: 'tajweed-heavy',
    title: 'Heavy & Light Letters',
    summary: 'Tafkheem and tarqeeq.',
    slides: [
      {
        title: 'Seven heavy letters',
        body: 'These letters are always pronounced “full” (raised tongue): خ ص ض غ ط ق ظ — remembered as “خُصَّ ضَغْطٍ قِظْ”.',
      },
      {
        title: 'The laam in “Allah”',
        body: 'The laam of the name Allah is heavy after a fatha or damma, and light after a kasra.',
        example: { ar: 'ٱللَّهُ أَحَدٌ', ref: '112:1' },
      },
    ],
    quiz: [
      { prompt: 'How many heavy (isti‘laa) letters are there?', options: ['7', '5', '15', '28'], answer: '7' },
      { prompt: 'Which letter is heavy?', options: ['ص', 'س', 'ب', 'ت'], answer: 'ص', optionsArabic: true },
      { prompt: 'The laam in “Allah” after a kasra is…', options: ['light', 'heavy', 'silent', 'doubled'], answer: 'light' },
    ],
  },
  {
    id: 'tajweed-makharij',
    title: 'Where Letters Come From',
    summary: 'The five areas of articulation.',
    slides: [
      {
        title: 'Five main areas (makharij)',
        bullets: [
          'The open space of the mouth/throat (al-jawf): the madd letters',
          'The throat (al-halq): ء ه ع ح غ خ',
          'The tongue (al-lisaan): most of the letters',
          'The lips (ash-shafatayn): ف م ب و',
          'The nasal passage (al-khayshoom): ghunnah',
        ],
      },
    ],
    quiz: [
      { prompt: 'Which letters come from the throat?', options: ['ء ه ع ح غ خ', 'ف م ب و', 'ق ط ب ج د', 'س ش ص ض'], answer: 'ء ه ع ح غ خ' },
      { prompt: 'Which letters use the lips?', options: ['ف م ب و', 'ع ح', 'ق ك', 'ل ن ر'], answer: 'ف م ب و' },
      { prompt: 'Ghunnah comes from the…', options: ['nasal passage', 'lips', 'throat', 'tongue tip'], answer: 'nasal passage' },
    ],
  },
  {
    id: 'tajweed-waqf',
    title: 'Stopping Signs',
    summary: 'Reading the small marks above the text.',
    slides: [
      {
        title: 'Common signs in the mushaf',
        bullets: [
          'م — you must stop here',
          'لا — do not stop here',
          'ج — you may stop or continue',
          'ط — stopping is preferred',
          'صلى — continuing is preferred',
          'قلى — stopping is preferred',
        ],
        body: 'Signs differ a little between printings; the key idea is to stop where the meaning is complete.',
      },
    ],
    quiz: [
      { prompt: 'The sign لا means…', options: ['do not stop', 'you must stop', 'stop or continue', 'repeat'], answer: 'do not stop' },
      { prompt: 'The sign م means…', options: ['you must stop', 'do not stop', 'skip this verse', 'recite quietly'], answer: 'you must stop' },
      { prompt: 'The sign ج means…', options: ['stopping is allowed', 'stopping is forbidden', 'stop twice', 'pause for a breath only'], answer: 'stopping is allowed' },
    ],
  },
]

// ───────────────────────── Foundations ─────────────────────────

export const BASICS_LESSONS: Lesson[] = [
  {
    id: 'basics-pillars',
    title: 'The Five Pillars',
    summary: 'The framework of Islam.',
    slides: [
      {
        title: 'Islam is built on five',
        body: 'The Prophet ﷺ said that Islam is built upon five (Sahih al-Bukhari 8):',
        bullets: [
          '1. Shahada — testifying that none has the right to be worshipped except Allah and that Muhammad ﷺ is His Messenger',
          '2. Salah — establishing the five daily prayers',
          '3. Zakat — giving the obligatory charity',
          '4. Sawm — fasting in the month of Ramadan',
          '5. Hajj — pilgrimage to the House for those who are able',
        ],
      },
    ],
    quiz: [
      { prompt: 'How many pillars of Islam are there?', options: ['5', '6', '4', '7'], answer: '5' },
      { prompt: 'Which pillar is fasting in Ramadan?', options: ['Sawm', 'Zakat', 'Hajj', 'Salah'], answer: 'Sawm' },
      { prompt: 'Hajj is obligatory for those who are…', options: ['able', 'over 60', 'rich only', 'living in Makkah'], answer: 'able' },
    ],
  },
  {
    id: 'basics-iman',
    title: 'The Articles of Faith',
    summary: 'What a Muslim believes.',
    slides: [
      {
        title: 'Six articles of belief',
        body: 'Belief in: Allah; His angels; His books; His messengers; the Last Day; and divine decree (qadar), the good and the bad of it.',
        example: { ar: 'ءَامَنَ ٱلرَّسُولُ بِمَآ أُنزِلَ إِلَيْهِ مِن رَّبِّهِۦ', ref: '2:285' },
      },
      { title: 'Divine decree', body: 'Allah says: “Indeed, all things We created with predestination.”', example: { ar: 'إِنَّا كُلَّ شَىْءٍ خَلَقْنَـٰهُ بِقَدَرٍ', ref: '54:49' } },
    ],
    quiz: [
      { prompt: 'How many articles of faith (iman) are there?', options: ['6', '5', '4', '10'], answer: '6' },
      { prompt: 'Which is NOT one of the articles of faith?', options: ['Belief in saints’ intercession', 'Belief in the angels', 'Belief in the Last Day', 'Belief in the books'], answer: 'Belief in saints’ intercession' },
      { prompt: 'Qadar means…', options: ['divine decree', 'prayer', 'charity', 'pilgrimage'], answer: 'divine decree' },
    ],
  },
  {
    id: 'basics-wudu',
    title: 'How to Make Wudu',
    summary: 'Purification before prayer.',
    slides: [
      {
        title: 'The command',
        body: 'Allah says to wash the face, the hands to the elbows, wipe the head, and wash the feet to the ankles.',
        example: { ar: 'إِذَا قُمْتُمْ إِلَى ٱلصَّلَوٰةِ فَٱغْسِلُوا۟ وُجُوهَكُمْ', ref: '5:6' },
      },
      {
        title: 'The usual steps',
        bullets: [
          'Intend, and say “Bismillah”',
          'Wash both hands, three times',
          'Rinse the mouth and the nose, three times',
          'Wash the face, three times',
          'Wash the arms up to the elbows (right, then left), three times',
          'Wipe the head, then the ears',
          'Wash the feet up to the ankles (right, then left), three times',
        ],
        body: 'Schools of thought differ on which acts are obligatory and which are recommended — ask your teacher for your school’s details.',
      },
    ],
    quiz: [
      { prompt: 'Which comes first in wudu?', options: ['Washing the hands', 'Washing the feet', 'Wiping the head', 'Washing the face'], answer: 'Washing the hands' },
      { prompt: 'How far up are the arms washed?', options: ['The elbows', 'The wrists', 'The shoulders', 'Not washed'], answer: 'The elbows' },
      { prompt: 'The head in wudu is…', options: ['wiped', 'washed three times', 'skipped', 'dipped in water'], answer: 'wiped' },
    ],
  },
  {
    id: 'basics-prayers',
    title: 'The Five Daily Prayers',
    summary: 'Names and number of rak‘ahs.',
    slides: [
      {
        title: 'Prayer at appointed times',
        body: 'Allah says that prayer is prescribed for the believers at specified times.',
        example: { ar: 'إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَـٰبًا مَّوْقُوتًا', ref: '4:103' },
      },
      {
        title: 'The obligatory (fard) units',
        bullets: ['Fajr (dawn): 2 rak‘ahs', 'Dhuhr (midday): 4', 'Asr (afternoon): 4', 'Maghrib (after sunset): 3', 'Isha (night): 4'],
        body: 'On Friday, Jumu‘ah (2 rak‘ahs, with the sermon) is prayed in place of Dhuhr.',
      },
    ],
    quiz: [
      { prompt: 'How many fard rak‘ahs in Fajr?', options: ['2', '3', '4', '5'], answer: '2' },
      { prompt: 'Which prayer has 3 fard rak‘ahs?', options: ['Maghrib', 'Asr', 'Isha', 'Fajr'], answer: 'Maghrib' },
      { prompt: 'How many daily prayers are obligatory?', options: ['5', '3', '6', '7'], answer: '5' },
    ],
  },
  {
    id: 'basics-rakah',
    title: 'Steps of a Rak‘ah',
    summary: 'The movements of prayer.',
    slides: [
      {
        title: 'One rak‘ah',
        bullets: [
          'Stand and say “Allahu Akbar” to begin (takbir)',
          'Recite Al-Fatihah, then another portion of the Quran (in the first two rak‘ahs)',
          'Bow (ruku‘) and glorify Allah',
          'Rise, then go down into prostration (sujud) — twice, with a short sitting between',
        ],
        body: 'After every two rak‘ahs you sit for the tashahhud, and the prayer ends with the salam to the right and left. Learn the exact words from a teacher.',
      },
    ],
    quiz: [
      { prompt: 'How many prostrations (sujud) are in each rak‘ah?', options: ['2', '1', '3', '4'], answer: '2' },
      { prompt: 'Which surah is recited in every rak‘ah?', options: ['Al-Fatihah', 'Al-Ikhlas', 'Al-Baqarah', 'An-Nas'], answer: 'Al-Fatihah' },
      { prompt: 'The prayer ends with…', options: ['the salam', 'the adhan', 'a prostration', 'the khutbah'], answer: 'the salam' },
    ],
  },
]

export const STATIC_LESSONS: Record<string, Lesson[]> = { tajweed: TAJWEED_LESSONS, basics: BASICS_LESSONS }

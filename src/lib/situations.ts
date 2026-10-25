// "What is on your heart?" — duas and verses for situations people actually face. Everything here is from the Qur'an or from hadith
// whose numbers were checked against the hadith text bundled with the app, so each source link opens the hadith itself.
// Matching is plain keyword matching (no AI), so it is instant, free, and cannot invent anything.
// A qualified scholar should review the list before wide release.

export type SituationSource = { label: string; book?: 'bukhari'; number?: number }
export type SituationQuran = { surah: number; from: number; to: number; note: string }
export type SituationDua = { arabic: string; transliteration: string; meaning: string; source: SituationSource }
export type Situation = {
  id: string
  title: string
  emoji: string
  feelings: string[] // words people use (matched as the start of a word, so "worr" catches worry/worried/worrying)
  intro: string
  quran: SituationQuran[]
  duas: SituationDua[]
  ruqyah?: boolean // also point to the Ruqyah section
}

export const SITUATIONS: Situation[] = [
  {
    id: 'anxiety',
    title: 'Worry, anxiety or sadness',
    emoji: '🌧️',
    feelings: ['worr', 'anxi', 'anxious', 'sad', 'sadness', 'grief', 'griev', 'sorrow', 'depress', 'low', 'down', 'upset', 'heavy', 'cry', 'lonely', 'stress', 'nervous', 'tense', 'panic'],
    intro: 'The Prophet ﷺ used to ask Allah for relief from worry and grief. You can say the same words, in your own language too.',
    quran: [
      { surah: 94, from: 5, to: 6, note: 'With hardship comes ease.' },
      { surah: 13, from: 28, to: 28, note: 'Hearts find rest in the remembrance of Allah.' },
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
        transliteration: 'Allāhumma innī a‘ūdhu bika minal-hammi wal-ḥazan, wal-‘ajzi wal-kasal, wal-bukhli wal-jubn, wa ḍala‘id-dayni wa ghalabatir-rijāl.',
        meaning: 'O Allah, I seek refuge with You from worry and grief, from incapacity and laziness, from cowardice and miserliness, from being heavily in debt and from being overpowered by men.',
        source: { label: 'Sahih al-Bukhari 6369', book: 'bukhari', number: 6369 },
      },
    ],
  },
  {
    id: 'hardship',
    title: 'Hardship, difficulty or distress',
    emoji: '⛈️',
    feelings: ['hardship', 'difficult', 'struggl', 'trouble', 'calamit', 'tough', 'overwhelm', 'stuck', 'trial', 'tribulation', 'hard', 'exhaust', 'burden'],
    intro: 'The Prophet ﷺ used these words at the time of distress. The Qur’an also records the dua of Yunus (Jonah) عليه السلام from the belly of the fish.',
    quran: [
      { surah: 21, from: 87, to: 87, note: 'The dua of Yunus عليه السلام: “There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.”' },
      { surah: 2, from: 286, to: 286, note: 'Allah does not burden a soul beyond its capacity.' },
    ],
    duas: [
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
        transliteration: 'Lā ilāha illallāhul-‘Aẓīmul-Ḥalīm, lā ilāha illallāhu Rabbul-‘Arshil-‘Aẓīm, lā ilāha illallāhu Rabbus-samāwāti wa Rabbul-arḍi wa Rabbul-‘Arshil-Karīm.',
        meaning: 'None has the right to be worshipped but Allah, the Mighty, the Forbearing. None has the right to be worshipped but Allah, Lord of the Mighty Throne. None has the right to be worshipped but Allah, Lord of the heavens, Lord of the earth and Lord of the noble Throne.',
        source: { label: 'Sahih al-Bukhari 6345', book: 'bukhari', number: 6345 },
      },
    ],
  },
  {
    id: 'fear',
    title: 'Fear, or feeling threatened',
    emoji: '🛡️',
    feelings: ['fear', 'afraid', 'scare', 'frighten', 'threat', 'enemy', 'danger', 'unsafe', 'terrif', 'worried about', 'bully', 'harass'],
    intro: 'These are the words of Ibrahim عليه السلام when he was thrown into the fire, and of the Prophet ﷺ when people gathered against him — they only increased their faith.',
    quran: [{ surah: 3, from: 173, to: 173, note: 'It increased them in faith, and they said: Allah is sufficient for us.' }],
    duas: [
      {
        arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
        transliteration: 'Ḥasbunallāhu wa ni‘mal-wakīl.',
        meaning: 'Allah is sufficient for us, and He is the best disposer of affairs.',
        source: { label: 'Sahih al-Bukhari 4563', book: 'bukhari', number: 4563 },
      },
    ],
  },
  {
    id: 'forgiveness',
    title: 'Regret and seeking forgiveness',
    emoji: '🤲',
    feelings: ['sin', 'sinn', 'regret', 'guilt', 'guilty', 'forgiv', 'repent', 'tawbah', 'ashamed', 'shame', 'mistake', 'wrong', 'wronged myself'],
    intro: 'Allah’s mercy is wider than any sin. These are the words of Adam and Hawwa عليهما السلام after their mistake, and Allah’s own invitation to everyone who feels they have gone too far.',
    quran: [
      { surah: 7, from: 23, to: 23, note: 'The dua of Adam and Hawwa عليهما السلام.' },
      { surah: 39, from: 53, to: 53, note: 'Do not despair of the mercy of Allah.' },
    ],
    duas: [],
  },
  {
    id: 'debt',
    title: 'Debt and money worries',
    emoji: '💳',
    feelings: ['debt', 'loan', 'money', 'poor', 'poverty', 'financ', 'broke', 'rent', 'bills', 'provision', 'rizq', 'job', 'jobless', 'unemploy', 'income', 'afford'],
    intro: 'The Prophet ﷺ often sought refuge from debt, and Allah promises provision from where one does not expect it.',
    quran: [{ surah: 65, from: 3, to: 3, note: 'Whoever relies upon Allah — He is sufficient for him.' }],
    duas: [
      {
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْمَأْثَمِ وَالْمَغْرَمِ',
        transliteration: 'Allāhumma innī a‘ūdhu bika minal-ma’thami wal-maghram.',
        meaning: 'O Allah, I seek refuge with You from sin and from being in debt.',
        source: { label: 'Sahih al-Bukhari 832', book: 'bukhari', number: 832 },
      },
    ],
  },
  {
    id: 'anger',
    title: 'Anger',
    emoji: '🔥',
    feelings: ['anger', 'angry', 'rage', 'furious', 'temper', 'mad', 'annoy', 'irritat', 'frustrat', 'resent'],
    intro: 'The Prophet ﷺ told two angry men that he knew a phrase which, if said, would make the anger go away.',
    quran: [],
    duas: [
      {
        arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
        transliteration: 'A‘ūdhu billāhi minash-shayṭānir-rajīm.',
        meaning: 'I seek refuge with Allah from Satan, the accursed.',
        source: { label: 'Sahih al-Bukhari 3282', book: 'bukhari', number: 3282 },
      },
    ],
  },
  {
    id: 'decision',
    title: 'Making a decision',
    emoji: '🧭',
    feelings: ['decision', 'decid', 'confus', 'choose', 'choice', 'marriage', 'marry', 'unsure', 'istikhar', 'crossroad', 'uncertain', 'direction'],
    intro: 'The Prophet ﷺ taught the prayer of guidance (istikhara) for every matter, as he taught the surahs of the Qur’an: pray two rak‘ahs that are not obligatory, then make the dua he taught.',
    quran: [{ surah: 1, from: 6, to: 6, note: 'Guide us to the straight path.' }],
    duas: [],
  },
  {
    id: 'knowledge',
    title: 'Study, exams and learning',
    emoji: '📚',
    feelings: ['exam', 'study', 'studi', 'learn', 'knowledge', 'memor', 'school', 'test', 'university', 'homework', 'revis', 'hifz', 'understand'],
    intro: 'Allah told His Prophet ﷺ to say this about knowledge.',
    quran: [{ surah: 20, from: 114, to: 114, note: 'The end of the verse: “My Lord, increase me in knowledge.”' }],
    duas: [],
  },
  {
    id: 'parents',
    title: 'For your parents',
    emoji: '🧓',
    feelings: ['parent', 'mother', 'father', 'mum', 'mom', 'dad', 'elder', 'grandmother', 'grandfather'],
    intro: 'A dua that Allah taught for parents, alive or deceased.',
    quran: [{ surah: 17, from: 24, to: 24, note: '“My Lord, have mercy upon them as they brought me up when I was small.”' }],
    duas: [],
  },
  {
    id: 'family',
    title: 'Spouse and children',
    emoji: '👨‍👩‍👧',
    feelings: ['wife', 'husband', 'spouse', 'child', 'children', 'kid', 'son', 'daughter', 'family', 'baby', 'pregnan', 'marriage'],
    intro: 'Duas of the righteous for their families.',
    quran: [
      { surah: 25, from: 74, to: 74, note: '“Our Lord, grant us from among our wives and offspring comfort to our eyes.”' },
      { surah: 14, from: 40, to: 40, note: '“My Lord, make me an establisher of prayer, and many from my descendants.”' },
    ],
    duas: [],
  },
  {
    id: 'faith',
    title: 'A steady heart and faith',
    emoji: '💚',
    feelings: ['faith', 'iman', 'doubt', 'weak', 'lost', 'far from', 'distant', 'steadfast', 'guidance', 'astray', 'imaan', 'hypocri', 'pray more', 'motivat', 'lazy'],
    intro: 'When faith feels weak, ask for a heart that stays on the path.',
    quran: [
      { surah: 3, from: 8, to: 8, note: '“Our Lord, let not our hearts deviate after You have guided us.”' },
      { surah: 2, from: 186, to: 186, note: 'Allah is near and answers those who call on Him.' },
    ],
    duas: [],
  },
  {
    id: 'illness',
    title: 'Illness and pain',
    emoji: '🩹',
    feelings: ['ill', 'sick', 'pain', 'ache', 'disease', 'health', 'cure', 'heal', 'hospital', 'surgery', 'fever', 'headache', 'cancer'],
    intro: 'Use these together with proper medical care. See also the Ruqyah section for the supplications of the Sunnah.',
    quran: [],
    duas: [],
    ruqyah: true,
  },
  {
    id: 'both-worlds',
    title: 'The best of this life and the next',
    emoji: '🌅',
    feelings: ['best', 'general', 'everything', 'bless', 'success', 'happy', 'happiness', 'gratitude', 'thankful', 'grateful', 'barakah', 'blessing'],
    intro: 'The dua the Prophet ﷺ made most often is in the Qur’an.',
    quran: [{ surah: 2, from: 201, to: 201, note: '“Our Lord, give us good in this world and good in the Hereafter, and protect us from the torment of the Fire.”' }],
    duas: [],
  },
]

const words = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)

// Which situations does what the person wrote fit best? Returns the best three (or none).
export function findSituations(text: string, limit = 3): Situation[] {
  const ws = words(text)
  if (!ws.length) return []
  const scored = SITUATIONS.map((s) => {
    let score = 0
    for (const f of s.feelings) {
      const stem = f.toLowerCase()
      if (stem.includes(' ')) {
        if (ws.join(' ').includes(stem)) score += 2
      } else if (ws.some((w) => w === stem || (stem.length >= 4 && w.startsWith(stem)))) score += 1
    }
    return { s, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.s)
}

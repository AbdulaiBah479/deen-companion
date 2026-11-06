// "Islam basics": the foundations every Muslim is taught, in plain steps: the five pillars, the six articles of faith, how to pray,
// ghusl and tayammum, fasting, daily etiquette, and a short glossary of the words scholars use. Static and short, so it is saved
// for offline use. Every hadith pinned here is from Sahih al-Bukhari or Sahih Muslim and is checked against the bundled text by
// tests/basics.test.mts. This is a learning aid, not a fatwa: where the schools differ, the notes say so.
import type { HadithPin } from './rituals'

export type Section = {
  id: string
  title: string
  titleAr: string
  icon: string
  intro: string
  steps?: { title: string; body: string; say?: { ar?: string; translit: string; meaning: string } }[]
  items?: { title: string; body: string; href?: string }[]
  notes?: string[]
  quran?: string[]
  hadith: HadithPin[]
}

export const SECTIONS: Section[] = [
  {
    id: 'pillars', title: 'The five pillars of Islam', titleAr: 'أركان الإسلام', icon: '🕋',
    intro: 'The Prophet ﷺ said that Islam is built on five. Everything else rests on them.',
    items: [
      { title: '1. The shahadah (testimony of faith)', body: 'To testify that there is no god but Allah, and that Muhammad ﷺ is the Messenger of Allah. It is the door into Islam.' },
      { title: '2. Salah (the five daily prayers)', body: 'Fajr, Dhuhr, Asr, Maghrib and Isha, at their times, every day.', href: '/prayer' },
      { title: '3. Zakat (the yearly purifying charity)', body: 'A set share of savings above the nisab, given to those who qualify.', href: '/zakat' },
      { title: '4. Sawm (fasting in Ramadan)', body: 'From true dawn to sunset for the whole month, for those able.', href: '/ramadan' },
      { title: '5. Hajj (pilgrimage to Makkah)', body: 'Once in a lifetime for those who can afford it and are able to travel.', href: '/guides' },
    ],
    hadith: [{ book: 'bukhari', number: 8, must: 'five' }],
  },
  {
    id: 'iman', title: 'The six articles of faith', titleAr: 'أركان الإيمان', icon: '💚',
    intro: 'When the angel Jibril asked the Prophet ﷺ “What is faith?”, he answered with six things.',
    items: [
      { title: '1. Belief in Allah', body: 'One God, the Creator and Sustainer, who has no partner.' },
      { title: '2. Belief in His angels', body: 'Created from light, they obey Allah and carry out His commands.' },
      { title: '3. Belief in His books', body: 'The Torah, the Gospel, the Psalms, the scrolls of Ibrahim, and the Quran, which is the last and is preserved.' },
      { title: '4. Belief in His messengers', body: 'From Adam to Muhammad ﷺ, the last of them. See the Stories section.', href: '/stories' },
      { title: '5. Belief in the Last Day', body: 'The Day of Judgement, the resurrection, the reckoning, Paradise and the Fire.' },
      { title: '6. Belief in the divine decree (qadar)', body: 'That Allah knows all things and what happens is by His knowledge and will, while we are responsible for our choices.' },
    ],
    quran: ['2:285'],
    hadith: [{ book: 'bukhari', number: 50, must: 'angels' }],
  },
  {
    id: 'pray', title: 'How to pray, step by step', titleAr: 'كيفية الصلاة', icon: '🤲',
    intro: 'The Prophet ﷺ said: “Pray as you have seen me praying.” This is the outline of one rak‘ah (unit) and how the units add up. Ask a teacher to show you and listen to you, because prayer is learned best by seeing.',
    steps: [
      { title: 'Prepare', body: 'Be in wudu, wear clean covering clothes, face the Qiblah, and be sure the time has come.' },
      { title: 'Stand and begin', body: 'Make the intention in your heart. Stand, raise your hands and say the opening takbir. Then place your hands on your chest or below it (the schools differ).', say: { translit: 'Allāhu akbar', meaning: 'Allah is the Greatest' } },
      { title: 'Recite', body: 'In every rak‘ah recite Surat al-Fatihah. In the first two rak‘ahs of every prayer, recite another surah or some verses after it. Fatihah and the surah are spoken aloud in Fajr and the first two rak‘ahs of Maghrib and Isha, and quietly in the others.' },
      { title: 'Bow (ruku‘)', body: 'Say the takbir and bow with your back straight and your hands on your knees. Stay still, and say it three times.', say: { translit: 'Subḥāna rabbiyal-‘aẓīm', meaning: 'Glory to my Lord, the Most Great' } },
      { title: 'Stand up from the bow', body: 'Rise saying the first phrase, and when upright say the second.', say: { translit: 'Sami‘a-llāhu liman ḥamidah · Rabbanā wa lakal-ḥamd', meaning: 'Allah hears the one who praises Him · Our Lord, to You is all praise' } },
      { title: 'Prostrate (sujud)', body: 'Say the takbir and go down on forehead and nose, both palms, both knees and the toes. Stay still, and make dua here: it is a moment when you are very near to your Lord.', say: { translit: 'Subḥāna rabbiyal-a‘lā', meaning: 'Glory to my Lord, the Most High' } },
      { title: 'Sit, then prostrate again', body: 'Say the takbir, sit upright briefly, then prostrate a second time as before.', say: { translit: 'Rabbighfir lī', meaning: 'My Lord, forgive me' } },
      { title: 'Stand for the next rak‘ah', body: 'Say the takbir and rise. That is one rak‘ah. Repeat for the number of rak‘ahs the prayer has.' },
      { title: 'Sit for the tashahhud', body: 'After the second rak‘ah, sit and recite the tashahhud (the greeting to Allah and the testimony of faith). In prayers of three or four rak‘ahs, stand for the rest, then sit again at the end. In the last sitting, add the blessings on the Prophet ﷺ, then make dua before the salam.' },
      { title: 'Finish with the salam', body: 'Turn your head to the right, then to the left.', say: { translit: 'As-salāmu ‘alaykum wa raḥmatullāh', meaning: 'Peace and the mercy of Allah be upon you' } },
    ],
    items: [
      { title: 'Rak‘ahs in each prayer', body: 'Fajr 2 · Dhuhr 4 · Asr 4 · Maghrib 3 · Isha 4 · Friday (Jumu‘ah) 2 in place of Dhuhr. The sunnah prayers before and after are in addition.', href: '/prayer' },
      { title: 'Calm is part of prayer', body: 'The Prophet ﷺ told a man who prayed too fast to bow, rise, prostrate and sit until his body was still, and to do the same in every rak‘ah.' },
    ],
    notes: ['The schools differ on small details: where the hands rest, whether the basmalah is said aloud, whether to raise the hands at each movement, the exact words of the tashahhud, and some points for women. Follow your teacher’s school; every authentic way is accepted.'],
    quran: ['1:1-7', '2:238'],
    hadith: [
      { book: 'bukhari', number: 631, must: 'pray' },
      { book: 'bukhari', number: 757, must: 'bow' },
      { book: 'bukhari', number: 831, must: 'Peace' },
    ],
  },
  {
    id: 'purify', title: 'Ghusl and tayammum', titleAr: 'الغسل والتيمم', icon: '💧',
    intro: 'Ghusl is the full bath that is required after janabah (sexual intercourse or emission), and after menstruation or postnatal bleeding ends. Tayammum replaces wudu or ghusl when there is no water or water would harm you.',
    steps: [
      { title: 'Ghusl: the way of the Prophet ﷺ', body: 'Make the intention. Wash the hands, then the private parts. Make a full wudu. Pour water over the head three times, making sure it reaches the roots of the hair. Then wash the rest of the body, right side first, so water reaches everywhere.' },
      { title: 'Tayammum: when there is no water', body: 'Make the intention. Strike clean earth (sand, dust, stone) once with both palms. Wipe the face, then the backs of the hands. It is then valid for prayer until something breaks it, or until water becomes available.' },
    ],
    notes: ['Scholars differ on whether tayammum needs one strike or two, and how far the hands are wiped (to the wrists or the elbows). The reports from the Prophet ﷺ support wiping the face and the backs of the hands.'],
    quran: ['5:6', '4:43'],
    hadith: [
      { book: 'bukhari', number: 248, must: 'ablution' },
      { book: 'bukhari', number: 343, must: 'earth' },
    ],
  },
  {
    id: 'fasting', title: 'Fasting in Ramadan: the basics', titleAr: 'أحكام الصيام', icon: '🌙',
    intro: 'Fasting is to stay from food, drink and marital relations from true dawn (Fajr) until sunset (Maghrib), with the intention to worship Allah. Its aim is taqwa.',
    items: [
      { title: 'Who must fast', body: 'Every Muslim who is an adult, sane, and able, and who is resident (not travelling).' },
      { title: 'Who is excused', body: 'The ill and the traveller make up the days later. A woman in her period or in postnatal bleeding must not fast and makes up the days. The very old, or those with a lasting illness, feed a poor person for each day. Pregnant and nursing women follow a scholar’s guidance on making up the days or feeding.' },
      { title: 'What breaks the fast', body: 'Eating, drinking or marital relations on purpose, deliberate vomiting, and the start of menstruation. Eating or drinking by mistake does not break it: the Prophet ﷺ said to complete the fast, as Allah fed and gave you drink.' },
      { title: 'What helps', body: 'Suhoor (the meal before dawn), breaking the fast promptly at sunset, extra prayers and Quran, and guarding the tongue and eyes.', href: '/ramadan' },
    ],
    notes: ['Rulings for the sick, for pregnancy and nursing, and for medicines and injections differ and depend on your situation. Ask a qualified scholar or a doctor who understands the rules.'],
    quran: ['2:183', '2:185', '2:187'],
    hadith: [
      { book: 'bukhari', number: 1904, must: 'fasting' },
      { book: 'bukhari', number: 1933, must: 'forget' },
    ],
  },
  {
    id: 'adab', title: 'Daily manners (adab) and sunnah', titleAr: 'آداب وسنن', icon: '🌿',
    intro: 'Small habits taught by the Prophet ﷺ turn ordinary days into worship. Many more duas are in the Duas section.',
    items: [
      { title: 'Greet with salam', body: 'The Prophet ﷺ said the best part of Islam is to feed people and to greet those you know and those you do not know. Say “As-salamu ‘alaykum” and answer it in full.' },
      { title: 'When you eat', body: 'Say Bismillah, eat with the right hand, and eat from what is in front of you.' },
      { title: 'Before sleep', body: 'Make wudu if you can, lie on your right side, and say the dua of sleep: “Bismika Allāhumma amūtu wa aḥyā”, with Your name, O Allah, I die and I live.', href: '/duas' },
      { title: 'Entering the toilet', body: 'Enter with the left foot and say: “Allāhumma innī a‘ūdhu bika minal-khubuthi wal-khabā’ith.” Leave with the right foot and say “Ghufrānaka”.' },
      { title: 'With the Quran', body: 'The best of you are those who learn the Quran and teach it. Give it a little time every day.', href: '/quran' },
    ],
    hadith: [
      { book: 'bukhari', number: 12, must: 'greet' },
      { book: 'bukhari', number: 5376, must: 'right hand' },
      { book: 'bukhari', number: 6324, must: 'die' },
      { book: 'bukhari', number: 142, must: 'khubuthi' },
      { book: 'bukhari', number: 5027, must: 'teach it' },
    ],
  },
]

export const GLOSSARY: { term: string; ar: string; meaning: string }[] = [
  { term: 'Fard', ar: 'فرض', meaning: 'An obligation. Leaving it without excuse is a sin. Fard ‘ayn is on each person (like the five prayers); fard kifayah is on the community (like the funeral prayer).' },
  { term: 'Wajib', ar: 'واجب', meaning: 'Required. Most schools use it as a synonym for fard; the Hanafi school places it just below fard.' },
  { term: 'Sunnah', ar: 'سنة', meaning: 'What the Prophet ﷺ said, did or approved. As a ruling it means a recommended act that earns reward and that you should not neglect.' },
  { term: 'Mustahabb', ar: 'مستحب', meaning: 'Recommended. Rewarded if done, no sin if left.' },
  { term: 'Mubah', ar: 'مباح', meaning: 'Permitted. Neither rewarded nor blamed in itself, though a good intention can make it worship.' },
  { term: 'Makruh', ar: 'مكروه', meaning: 'Disliked. Better to avoid, but not a sin.' },
  { term: 'Haram', ar: 'حرام', meaning: 'Forbidden. Doing it is a sin.' },
  { term: 'Halal', ar: 'حلال', meaning: 'Allowed.' },
  { term: 'Niyyah', ar: 'نية', meaning: 'Intention, held in the heart. Deeds are judged by it.' },
  { term: 'Qiblah', ar: 'قبلة', meaning: 'The direction of the Ka‘bah in Makkah, which Muslims face in prayer.' },
  { term: 'Wudu', ar: 'وضوء', meaning: 'The washing of face, arms, head and feet before prayer.' },
  { term: 'Ghusl', ar: 'غسل', meaning: 'The full ritual bath.' },
  { term: 'Tawhid', ar: 'توحيد', meaning: 'The oneness of Allah: that He alone is to be worshipped.' },
  { term: 'Taqwa', ar: 'تقوى', meaning: 'Awareness of Allah that keeps a person from what He dislikes and moves him toward what He loves.' },
  { term: 'Fatwa', ar: 'فتوى', meaning: 'A ruling given by a qualified scholar to a specific question. This app gives learning material, not fatwas.' },
]

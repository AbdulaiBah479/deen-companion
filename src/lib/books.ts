// The book shelf. Two kinds of entry:
//  • BOOKS can be read (and listened to) inside the app, because the text is free to share: English translations from Project
//    Gutenberg (public domain) and Arabic originals from Arabic Wikisource (licence CC BY-SA 4.0, so the source is always credited).
//  • READING_LIST books are not copied into the app. Each shows why it matters and where to look for it; nothing is promised about
//    where a copy lives, because that changes. These are the works we cannot lawfully reproduce or have not been able to check.
// No hadith collections are included here (they have their own section).

export type Field = 'Spirituality' | 'Creed' | 'Philosophy' | 'Ethics & poetry' | 'History & society' | 'Law & method' | 'Seerah'

export type Book = {
  id: string
  title: string
  titleAr?: string
  author: string
  authorAr?: string
  died?: string
  field: Field
  blurb: string
  english?: { gutenberg: number; translator: string; year: string; note?: string }
  arabic?: { wikisource: string; note?: string }
}

export const BOOKS: Book[] = [
  {
    id: 'munqidh', title: 'Deliverance from Error (Al-Munqidh min ad-Dalal)', titleAr: 'المنقذ من الضلال', author: 'Imam Abu Hamid al-Ghazali', authorAr: 'أبو حامد الغزالي', died: 'd. 505 AH / 1111 CE', field: 'Spirituality',
    blurb: 'Al-Ghazali’s own account of his search for certainty: through theology, philosophy and the Batini claims, to the way of the Sufis and the light of faith.',
    english: { gutenberg: 58977, translator: 'Claud Field', year: '1909', note: 'An early English version, titled “The Confessions of Al Ghazzali”. Newer translations are more exact; use this one for a first reading.' },
    arabic: { wikisource: 'المنقذ من الضلال' },
  },
  {
    id: 'ghazali-teachings', title: 'Religious and Moral Teachings of al-Ghazali', titleAr: 'من إحياء علوم الدين', author: 'Imam Abu Hamid al-Ghazali', authorAr: 'أبو حامد الغزالي', died: 'd. 505 AH / 1111 CE', field: 'Ethics & poetry',
    blurb: 'Selected passages from the Ihya’ ‘Ulum ad-Din (Revival of the Religious Sciences) on knowledge, worship, character, and the heart.',
    english: { gutenberg: 73140, translator: 'Syed Nawab Ali', year: 'early 1900s', note: 'Selections only, with an introduction by A. G. Widgery (not al-Ghazali’s words).' },
  },
  {
    id: 'bidayat', title: 'Beginning of Guidance (Bidayat al-Hidaya)', titleAr: 'بداية الهداية', author: 'Imam Abu Hamid al-Ghazali', authorAr: 'أبو حامد الغزالي', died: 'd. 505 AH / 1111 CE', field: 'Spirituality',
    blurb: 'A short guide to the daily life of the believer: duties of worship, manners with Allah and with people, and avoiding sins.',
    arabic: { wikisource: 'بداية الهداية' },
  },
  {
    id: 'hayy', title: 'Hayy ibn Yaqzan (The Improvement of Human Reason)', titleAr: 'حي بن يقظان', author: 'Ibn Tufayl', authorAr: 'ابن طفيل', died: 'd. 581 AH / 1185 CE', field: 'Philosophy',
    blurb: 'A story of a child raised alone on an island who reaches knowledge of the Creator by reason and reflection, until he meets a man of revelation.',
    english: { gutenberg: 16831, translator: 'Simon Ockley', year: '1708', note: 'A very old translation in old spelling. It includes the translator’s own dedication and appendix, which are not Ibn Tufayl’s words.' },
    arabic: { wikisource: 'حي بن يقظان' },
  },
  {
    id: 'kashf', title: 'Kashf al-Mahjub (The Unveiling of the Veiled)', titleAr: 'كشف المحجوب', author: 'Ali al-Hujwiri', authorAr: 'علي بن عثمان الهجويري', died: 'd. c. 465 AH / 1072 CE', field: 'Spirituality',
    blurb: 'One of the oldest Persian books on Sufism: the meaning of tasawwuf, the lives of early saints, and the discipline of the path.',
    english: { gutenberg: 64786, translator: 'Reynold A. Nicholson', year: '1911', note: 'A long book; it is read here in pages. The Persian original is not available here.' },
  },
  {
    id: 'bustan', title: 'The Bustan (The Orchard)', titleAr: 'بوستان', author: 'Sa‘di of Shiraz', authorAr: 'سعدي الشيرازي', died: 'd. c. 691 AH / 1292 CE', field: 'Ethics & poetry',
    blurb: 'Stories and verse on justice, kindness, humility, gratitude and contentment, one of the best-loved books of manners in Persian.',
    english: { gutenberg: 60471, translator: 'A. Hart Edwards', year: 'early 1900s', note: 'A free English rendering of the Persian original.' },
  },
  {
    id: 'rumi', title: 'The Persian Mystics: Jalalu’d-din Rumi', titleAr: 'مولانا جلال الدين الرومي', author: 'Jalal ad-Din Rumi', authorAr: 'جلال الدين الرومي', died: 'd. 672 AH / 1273 CE', field: 'Ethics & poetry',
    blurb: 'Selections from the Masnavi and the Divan: love of Allah, longing, and the soul’s return.',
    english: { gutenberg: 45159, translator: 'edited by F. Hadland Davis', year: '1907', note: 'Early free translations of selections, with an introduction by the editor (not Rumi’s words).' },
  },
  {
    id: 'tahawiyya', title: 'The Creed of at-Tahawi (Al-‘Aqida at-Tahawiyya)', titleAr: 'متن العقيدة الطحاوية', author: 'Imam Abu Ja‘far at-Tahawi', authorAr: 'أبو جعفر الطحاوي', died: 'd. 321 AH / 933 CE', field: 'Creed',
    blurb: 'A short statement of the beliefs of Ahl as-Sunnah wa’l-Jama‘ah, accepted across the schools and taught in many madrasas.',
    arabic: { wikisource: 'متن العقيدة الطحاوية' },
  },
  {
    id: 'lumah', title: 'Lum‘at al-I‘tiqad', titleAr: 'لمعة الاعتقاد الهادي إلى سبيل الرشاد', author: 'Ibn Qudama al-Maqdisi', authorAr: 'ابن قدامة المقدسي', died: 'd. 620 AH / 1223 CE', field: 'Creed',
    blurb: 'A concise summary of Sunni creed in the Hanbali tradition, built on the Quran and Sunnah.',
    arabic: { wikisource: 'لمعة الاعتقاد الهادي إلى سبيل الرشاد' },
  },
]

export const bookById = (id: string) => BOOKS.find((b) => b.id === id)

export type Listed = { title: string; titleAr: string; author: string; died: string; field: Field; why: string; query: string }

// More of the great non-hadith books, with a plain note on why each matters. Nothing here is copied into the app.
export const READING_LIST: Listed[] = [
  { title: 'Ihya’ ‘Ulum ad-Din', titleAr: 'إحياء علوم الدين', author: 'al-Ghazali', died: 'd. 505 AH', field: 'Spirituality', why: 'The most widely read book on purifying the heart and perfecting worship and character; in four quarters.', query: 'إحياء علوم الدين الغزالي' },
  { title: 'Al-Risala', titleAr: 'الرسالة', author: 'Imam ash-Shafi‘i', died: 'd. 204 AH', field: 'Law & method', why: 'The first book on the principles of Islamic law: how the Quran, Sunnah, consensus and analogy are used.', query: 'الرسالة الشافعي' },
  { title: 'Al-Muqaddima', titleAr: 'مقدمة ابن خلدون', author: 'Ibn Khaldun', died: 'd. 808 AH', field: 'History & society', why: 'A groundbreaking study of how societies rise and fall; the introduction to his world history.', query: 'مقدمة ابن خلدون' },
  { title: 'Al-Risala al-Qushayriyya', titleAr: 'الرسالة القشيرية', author: 'al-Qushayri', died: 'd. 465 AH', field: 'Spirituality', why: 'A classic on the sayings and stations of the early Sufis, grounded in the Quran and Sunnah.', query: 'الرسالة القشيرية' },
  { title: 'Madarij as-Salikin', titleAr: 'مدارج السالكين', author: 'Ibn al-Qayyim', died: 'd. 751 AH', field: 'Spirituality', why: 'A deep commentary on the stations of the traveller to Allah: repentance, patience, gratitude, trust and love.', query: 'مدارج السالكين ابن القيم' },
  { title: 'Ad-Da’ wa’d-Dawa’', titleAr: 'الداء والدواء', author: 'Ibn al-Qayyim', died: 'd. 751 AH', field: 'Spirituality', why: 'On sins and their harm, and the cure: a famous book of self-reform.', query: 'الداء والدواء ابن القيم' },
  { title: 'Al-Fawa’id', titleAr: 'الفوائد', author: 'Ibn al-Qayyim', died: 'd. 751 AH', field: 'Spirituality', why: 'Short reflections for the heart on faith, knowledge and character.', query: 'الفوائد ابن القيم' },
  { title: 'Al-Muwafaqat', titleAr: 'الموافقات', author: 'ash-Shatibi', died: 'd. 790 AH', field: 'Law & method', why: 'The great work on the objectives (maqasid) of the Shari‘ah.', query: 'الموافقات الشاطبي' },
  { title: 'Sirat Ibn Hisham', titleAr: 'السيرة النبوية لابن هشام', author: 'Ibn Hisham, from Ibn Ishaq', died: 'd. c. 213 AH', field: 'Seerah', why: 'The earliest full biography of the Prophet ﷺ that has reached us.', query: 'السيرة النبوية ابن هشام' },
  { title: 'Ar-Raheeq al-Makhtum (The Sealed Nectar)', titleAr: 'الرحيق المختوم', author: 'Safi ur-Rahman al-Mubarakpuri', died: 'modern', field: 'Seerah', why: 'A modern, clear biography of the Prophet ﷺ; it won first prize at a 1979 seerah competition.', query: 'الرحيق المختوم' },
  { title: 'Al-Bidaya wa’n-Nihaya', titleAr: 'البداية والنهاية', author: 'Ibn Kathir', died: 'd. 774 AH', field: 'History & society', why: 'A history of the world from creation to the author’s time, with the stories of the prophets and the early Muslims.', query: 'البداية والنهاية ابن كثير' },
  { title: 'Tarikh at-Tabari', titleAr: 'تاريخ الرسل والملوك', author: 'at-Tabari', died: 'd. 310 AH', field: 'History & society', why: 'The classic universal history, with chains of narrators for its reports.', query: 'تاريخ الطبري' },
  { title: 'Matn Abi Shuja‘ (Al-Ghayat wa’t-Taqrib)', titleAr: 'متن أبي شجاع', author: 'Abu Shuja‘ al-Isfahani', died: 'd. 593 AH', field: 'Law & method', why: 'A short, clear primer of Shafi‘i fiqh, often the first fiqh text a student learns.', query: 'متن أبي شجاع الغاية والتقريب' },
  { title: 'Mukhtasar al-Quduri', titleAr: 'مختصر القدوري', author: 'al-Quduri', died: 'd. 428 AH', field: 'Law & method', why: 'The standard beginner’s text of Hanafi fiqh.', query: 'مختصر القدوري' },
  { title: 'Ar-Risala of Ibn Abi Zayd al-Qayrawani', titleAr: 'رسالة ابن أبي زيد القيرواني', author: 'Ibn Abi Zayd al-Qayrawani', died: 'd. 386 AH', field: 'Law & method', why: 'The standard beginner’s text of Maliki fiqh, opening with a short creed.', query: 'رسالة ابن أبي زيد القيرواني' },
  { title: 'Umdat al-Fiqh', titleAr: 'عمدة الفقه', author: 'Ibn Qudama', died: 'd. 620 AH', field: 'Law & method', why: 'A brief, clear text of Hanbali fiqh for beginners.', query: 'عمدة الفقه ابن قدامة' },
  { title: 'Minhaj al-‘Abidin', titleAr: 'منهاج العابدين', author: 'al-Ghazali', died: 'd. 505 AH', field: 'Spirituality', why: 'The path of the worshipper: knowledge, repentance, obstacles, and gratitude.', query: 'منهاج العابدين الغزالي' },
  { title: 'Tahafut al-Falasifa', titleAr: 'تهافت الفلاسفة', author: 'al-Ghazali', died: 'd. 505 AH', field: 'Philosophy', why: 'Al-Ghazali’s critique of the philosophers on twenty questions.', query: 'تهافت الفلاسفة الغزالي' },
]

const enc = encodeURIComponent
// Search pages, not book pages: they stay valid when a library moves a file.
export const searchLinks = (q: string) => [
  { label: 'Arabic Wikisource', href: `https://ar.wikisource.org/w/index.php?search=${enc(q)}` },
  { label: 'Internet Archive', href: `https://archive.org/search?query=${enc(q)}` },
]

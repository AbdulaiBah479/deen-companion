// The sermon (khutbah) library: topics that never run out, each tied to verses and Bukhari/Muslim hadith that are looked up
// from the app's own data (so the words shown are never typed from memory), and the fixed parts of the Friday sermon.

export type HadithSpec = { q: string; must: string } // a search, and a word the right hadith must contain
export type Topic = {
  id: string
  title: string
  kind: 'evergreen' | 'occasion'
  blurb: string
  quran: string[] // "3:102" or "2:155-157"
  hadith: HadithSpec[]
  points: string[] // what the sermon should make clear, in order
}

export const TOPICS: Topic[] = [
  // ───────── always relevant ─────────
  { id: 'taqwa', title: 'Taqwa — being aware of Allah', kind: 'evergreen', blurb: 'The root of every good deed and the best provision.', quran: ['3:102', '49:13', '65:2-3'], hadith: [],
    points: ['What taqwa means: living with the awareness that Allah sees us, not only fear.', 'Its fruits: a way out of difficulty and provision from where we do not expect.', 'How to build it each day: prayer on time, guarding the tongue, quick repentance.'] },
  { id: 'sincerity', title: 'Sincerity (ikhlas) and the intention', kind: 'evergreen', blurb: 'Deeds are judged by their intention.', quran: ['98:5', '39:2', '6:162-163'], hadith: [{ q: 'the reward of deeds depends upon the intentions and every person will get the reward according to what he has intended', must: 'intended' }],
    points: ['Every deed starts with an intention, and the same act can be worship or habit.', 'Show-off and seeking praise destroy reward; sincerity protects it.', 'Practical steps: renew the intention before acts, hide some good deeds, ask Allah for acceptance.'] },
  { id: 'patience', title: 'Patience (sabr) in hardship', kind: 'evergreen', blurb: 'Comfort and guidance for hard times.', quran: ['2:153', '2:155-157', '39:10'], hadith: [{ q: 'affair of the believer is all good', must: 'believer' }, { q: 'no calamity befalls a Muslim but Allah expiates his sins thorn', must: 'thorn' }],
    points: ['Trials are certain, and they are a test, not a sign that Allah has left us.', 'Three kinds of patience: in obedience, away from sin, and in hardship.', 'What patience is not: silence about injustice, or giving up on doing what we can.'] },
  { id: 'gratitude', title: 'Gratitude (shukr)', kind: 'evergreen', blurb: 'Counting blessings changes the heart.', quran: ['14:7', '2:152', '16:18'], hadith: [{ q: 'the Prophet stood in prayer until his feet swelled should I not be a thankful slave', must: 'thankful' }],
    points: ['Blessings we stop noticing: health, safety, family, faith.', 'Gratitude is of the heart, the tongue and the limbs.', 'Thanking people is part of thanking Allah.'] },
  { id: 'repentance', title: 'Repentance (tawbah) and Allah’s mercy', kind: 'evergreen', blurb: 'The door is always open.', quran: ['39:53', '66:8', '25:70'], hadith: [{ q: 'Allah is more pleased with the repentance of His servant', must: 'repent' }],
    points: ['Never despair of Allah’s mercy, whatever the sin.', 'The conditions: stop, regret, resolve not to return, and set right any wrong to others.', 'Hiding our sins and not boasting of them; turning back often.'] },
  { id: 'character', title: 'Good character (akhlaq)', kind: 'evergreen', blurb: 'The heaviest thing on the scale.', quran: ['68:4', '3:159', '41:34-35', '25:63'], hadith: [{ q: 'the best of you are those with the best character', must: 'character' }],
    points: ['The Prophet ﷺ was sent to perfect good character, and he is our example.', 'Gentleness, forgiveness and answering evil with good.', 'Character is shown at home and in dealings, not only in the mosque.'] },
  { id: 'parents', title: 'Honouring parents', kind: 'evergreen', blurb: 'Kindness to parents comes right after worship of Allah.', quran: ['17:23-24', '31:14', '46:15'], hadith: [{ q: 'who is most deserving of my good company mother', must: 'mother' }],
    points: ['Allah joins His right with the right of parents.', 'Kindness in word, in time, in spending, and in dua, even when they are old or difficult.', 'After they have passed: dua, charity on their behalf, keeping their ties.'] },
  { id: 'brotherhood', title: 'Brotherhood and unity', kind: 'evergreen', blurb: 'The believers are one body.', quran: ['3:103', '49:10', '49:11-12'], hadith: [{ q: 'none of you truly believes until he loves for his brother what he loves for himself', must: 'brother' }, { q: 'believers are like one body', must: 'body' }],
    points: ['Faith is shown in wanting for others what we want for ourselves.', 'What breaks a community: mocking, suspicion, backbiting.', 'Practical unity: visiting, forgiving, settling disputes, helping the needy.'] },
  { id: 'honesty', title: 'Truthfulness and trust (amanah)', kind: 'evergreen', blurb: 'The mark of the believer.', quran: ['9:119', '33:70-71', '4:58'], hadith: [{ q: 'truthfulness leads to righteousness', must: 'truthful' }],
    points: ['Truthfulness leads to righteousness and to Paradise; lying leads the other way.', 'Trusts are many: money, secrets, work, a position, a promise.', 'Honesty in small things at work and in business.'] },
  { id: 'justice', title: 'Justice and avoiding oppression', kind: 'evergreen', blurb: 'Allah commands justice and kindness.', quran: ['4:135', '5:8', '16:90'], hadith: [{ q: 'beware of injustice, for injustice will be darkness on the Day of Resurrection', must: 'darkness' }],
    points: ['Justice even against ourselves, our family, or those we dislike.', 'Oppression has many faces: wealth, tongue, authority, family.', 'The dua of the wronged is answered; return rights before the Day when there is no coin.'] },
  { id: 'charity', title: 'Charity and generosity', kind: 'evergreen', blurb: 'Giving purifies and grows what we have.', quran: ['2:261', '2:267', '57:7'], hadith: [{ q: 'charity does not decrease wealth', must: 'wealth' }],
    points: ['Wealth is a trust from Allah; giving cleans the heart.', 'Give from what is good, and give quietly when you can.', 'Zakat is an obligation; voluntary charity of every kind is also reward, even a smile.'] },
  { id: 'trials', title: 'Hope when life is hard', kind: 'evergreen', blurb: 'With hardship comes ease.', quran: ['94:5-6', '2:286', '2:155-157'], hadith: [{ q: 'strange are the affairs of the believer', must: 'believer' }],
    points: ['Allah does not burden a soul beyond its capacity.', 'Hardship carries a reward, wipes out sins, and brings us back to Allah.', 'Sharing a burden: speak to someone, seek help, ask Allah, and make dua.'] },
  { id: 'knowledge', title: 'Seeking knowledge', kind: 'evergreen', blurb: 'The path that Allah makes easy to Paradise.', quran: ['58:11', '20:114', '96:1-5'], hadith: [{ q: 'treads a path in search of knowledge Allah make easy the path to Paradise', must: 'search of knowledge' }],
    points: ['The first revelation was “Read”.', 'Knowledge is for action and for teaching; take it from reliable teachers.', 'Learn what we must know: our faith, our prayer, our dealings, and our family.'] },
  { id: 'prayer', title: 'The prayer (salah)', kind: 'evergreen', blurb: 'The first thing we will be asked about.', quran: ['29:45', '2:45', '23:1-2', '20:14'], hadith: [{ q: 'five daily prayers like a river at the door', must: 'river' }],
    points: ['Prayer keeps us from shameful deeds and is a constant meeting with Allah.', 'Khushu‘: coming to prayer with presence of heart, not rushing.', 'Keeping it on time, in congregation for men, and teaching our children.'] },
  { id: 'tawakkul', title: 'Trust in Allah (tawakkul)', kind: 'evergreen', blurb: 'Take the means, and rely on Allah.', quran: ['65:2-3', '3:173', '3:159'], hadith: [],
    points: ['Tawakkul is not leaving the means; it is working and then leaving the result to Allah.', 'It frees the heart from anxiety about provision and the future.', 'The Companions faced fear with “Allah is enough for us, and He is the best disposer of affairs.”'] },
  { id: 'akhirah', title: 'Remembering death and the Hereafter', kind: 'evergreen', blurb: 'This world is a journey.', quran: ['3:185', '59:18', '57:20'], hadith: [{ q: 'be in this world as if you were a stranger or a traveller', must: 'stranger' }],
    points: ['Every soul will taste death; the real success is on that Day.', 'Look at what we are sending ahead.', 'Living lightly: do not let the world fill the heart.'] },
  { id: 'youth', title: 'Youth and a life with purpose', kind: 'evergreen', blurb: 'The strength of youth is a trust.', quran: ['18:13', '12:23', '51:56'], hadith: [{ q: 'a young man who grew up in the worship of Allah in the shade', must: 'shade' }],
    points: ['The young men of the cave: faith strengthened by guidance.', 'Yusuf, peace be upon him, and holding firm against temptation.', 'Choose friends, habits and goals that help us remember Allah.'] },
  { id: 'family', title: 'Marriage and family life', kind: 'evergreen', blurb: 'Tranquillity, love and mercy.', quran: ['30:21', '4:19', '66:6'], hadith: [{ q: 'treat women kindly', must: 'women' }],
    points: ['The aim of marriage: tranquillity, affection and mercy.', 'Living together in kindness; the example of the Prophet ﷺ in his home.', 'Protecting the family with faith, time, and good guidance for children.'] },
  { id: 'neighbours', title: 'Neighbours and community', kind: 'evergreen', blurb: 'Jibril kept advising about the neighbour.', quran: ['4:36', '5:2'], hadith: [{ q: 'whoever believes in Allah and the Last Day should be generous to his neighbor', must: 'neighb' }],
    points: ['The right of the neighbour, Muslim or not, near or far.', 'Cooperate in good and in taqwa, not in sin.', 'Small acts: greeting, a gift of food, checking on the sick and the lonely.'] },
  { id: 'tongue', title: 'Guarding the tongue (and social media)', kind: 'evergreen', blurb: 'Words are recorded.', quran: ['50:18', '49:6', '17:36', '49:12'], hadith: [{ q: 'whoever believes in Allah and the Last Day let him speak good or remain silent', must: 'silent' }],
    points: ['Every word is written; spreading unchecked news harms people.', 'Backbiting, mockery, and rumours online are as real as those in person.', 'Check before you share, and speak only good.'] },
  { id: 'halal', title: 'Halal earning and honest work', kind: 'evergreen', blurb: 'Provision with a clean conscience.', quran: ['2:188', '62:10', '2:168'], hadith: [{ q: 'no one has ever eaten better food than that which he has earned by working with his own hands', must: 'hands' }],
    points: ['Seeking provision is worship when it is honest.', 'Avoid bribes, cheating in weights and measures, and interest.', 'Work with excellence; what is earned wrongly spoils the rest.'] },
  { id: 'anger', title: 'Controlling anger', kind: 'evergreen', blurb: 'The strong man is the one who controls himself.', quran: ['3:134', '42:37', '7:199'], hadith: [{ q: 'the strong is not the one who overcomes the people by his strength', must: 'strong' }],
    points: ['Anger is a flame of the devil; the Prophet ﷺ told us what to do.', 'Steps: say a’udhu billah, change position, be silent, make wudu.', 'Forgiveness raises a person and is rewarded.'] },
  { id: 'anxiety', title: 'Peace of heart and anxiety', kind: 'evergreen', blurb: 'In the remembrance of Allah hearts find rest.', quran: ['13:28', '2:286', '94:5-6'], hadith: [{ q: 'no fatigue, nor disease, nor sorrow, nor sadness, nor hurt, nor distress befalls a Muslim', must: 'sorrow' }],
    points: ['Worry is human; the Prophet ﷺ also taught duas against anxiety and sadness.', 'The remembrance of Allah, prayer, and the Quran bring calm.', 'Seeking help is a part of faith: speak with someone you trust, and see a doctor when needed.'] },
  { id: 'love-prophet', title: 'Love of the Prophet ﷺ and following him', kind: 'evergreen', blurb: 'Love shown in following.', quran: ['3:31', '33:21', '9:128', '21:107'], hadith: [{ q: 'none of you will have faith till I am dearer to him than his father his children and all mankind', must: 'dearer' }],
    points: ['His mercy and concern for his community.', 'Love is shown in following his way and his manners, not only in words.', 'Send blessings on him, and learn his life.'] },
  { id: 'earth', title: 'Caring for the earth', kind: 'evergreen', blurb: 'We are stewards, not owners.', quran: ['7:56', '30:41', '6:141'], hadith: [{ q: 'Muslim who plants a tree or sows seeds and a bird or a person or an animal eats from it is regarded as a charitable gift', must: 'plants' }],
    points: ['Allah made the earth a trust: do not spread corruption.', 'Waste of water and food is blameworthy, even in worship.', 'Plant, conserve, and leave things better than we found them.'] },
  // ───────── occasions ─────────
  { id: 'friday', title: 'The virtue of Friday and the Jumu‘ah prayer', kind: 'occasion', blurb: 'The best day the sun rises on.', quran: ['62:9-10', '33:56'], hadith: [{ q: 'the best day on which the sun has risen is Friday', must: 'friday' }],
    points: ['Friday is the best day: Adam was created and the Hour will come on it.', 'Etiquette: ghusl, the best clothes, early arrival, listening to the khutbah, and sending blessings on the Prophet ﷺ.', 'Returning to work after the prayer, and remembering Allah much.'] },
  { id: 'ramadan-coming', title: 'Welcoming Ramadan', kind: 'occasion', blurb: 'Preparing hearts for the month of the Quran.', quran: ['2:183', '2:185', '2:186'], hadith: [{ q: 'whoever fasts the month of Ramadan out of sincere faith and hoping for a reward his past sins will be forgiven', must: 'ramadan' }],
    points: ['The month in which the Quran was sent down, and the purpose of fasting: taqwa.', 'Prepare: repent, reconcile, learn the rulings, and make a plan for the Quran.', 'Beyond food and drink: guard the eyes, tongue and time.'] },
  { id: 'last-ten', title: 'The last ten nights and Laylat al-Qadr', kind: 'occasion', blurb: 'A night better than a thousand months.', quran: ['97:1-5', '44:3'], hadith: [{ q: 'whoever stands in prayer on Laylat al-Qadr out of faith and seeking reward', must: 'qadr' }],
    points: ['The virtue of the night: the Quran was sent down, and mercy and peace descend.', 'Seek it in the odd nights of the last ten; the Prophet ﷺ strove harder in them.', 'Dua of the Prophet ﷺ: “O Allah, You are Forgiving and love forgiveness, so forgive me.”'] },
  { id: 'eid-fitr', title: 'Eid al-Fitr — gratitude and joy', kind: 'occasion', blurb: 'Thanking Allah after Ramadan.', quran: ['2:185', '87:14-15'], hadith: [{ q: 'Eid fitr charity zakat sadaqat al-fitr', must: 'fitr' }],
    points: ['We celebrate by thanking Allah who helped us to complete the month.', 'Zakat al-Fitr, and sharing joy with the poor and the lonely.', 'Keep the habits of Ramadan: the Quran, night prayer, charity, and fasting six days of Shawwal.'] },
  { id: 'dhul-hijjah', title: 'The first ten days of Dhul Hijjah', kind: 'occasion', blurb: 'The best days of the year for good deeds.', quran: ['89:1-2', '22:28', '2:203'], hadith: [{ q: 'there are no days in which righteous deeds are more beloved to Allah than these ten days', must: 'days' }],
    points: ['Why these days are special and what the Prophet ﷺ said about them.', 'What to do: fasting (especially Arafah for those not on Hajj), takbir, dhikr, charity.', 'The day of Arafah and its forgiveness.'] },
  { id: 'eid-adha', title: 'Eid al-Adha — sacrifice and submission', kind: 'occasion', blurb: 'The story of Ibrahim and Isma‘il.', quran: ['37:102', '22:37', '2:196'], hadith: [{ q: 'came to this House and did not have sexual intercourse nor committed sin returned as his mother bore him', must: 'mother' }],
    points: ['Ibrahim’s and Isma‘il’s submission, and what it teaches about putting Allah first.', 'It is taqwa, not meat or blood, that reaches Allah.', 'Share the sacrifice with family, neighbours and the poor.'] },
  { id: 'hijri', title: 'The Hijri new year and the lesson of Hijrah', kind: 'occasion', blurb: 'A new year, a new start.', quran: ['9:40', '2:218', '59:18'], hadith: [{ q: 'the emigrant is the one who abandons what Allah has forbidden', must: 'forbidden' }],
    points: ['The Hijrah as a turning point in history: sacrifice, planning and trust in Allah.', 'The true muhajir leaves what Allah has forbidden.', 'Taking account of ourselves at the turn of the year.'] },
  { id: 'ashura', title: 'Ashura and the story of Musa', kind: 'occasion', blurb: 'The day Allah saved Musa and his people.', quran: ['2:50', '26:61-66'], hadith: [{ q: 'the Prophet came to Medina and saw the Jews fasting on the day of Ashura the day Allah saved Bani Israel from their enemy Musa fasted', must: 'ashura' }],
    points: ['Allah saved Musa and drowned Pharaoh: no tyrant lasts.', 'The Prophet ﷺ fasted the 10th with the 9th (or 11th).', 'Hope in Allah’s help for the oppressed.'] },
  { id: 'isra', title: 'Al-Isra’ wal-Mi‘raj — the gift of the prayer', kind: 'occasion', blurb: 'A journey that ends with a gift.', quran: ['17:1', '17:78'], hadith: [],
    points: ['The night journey from Makkah to Jerusalem: a sign of Allah’s power and the Prophet’s honour.', 'The gift of the five daily prayers.', 'The place of Al-Aqsa in the hearts of Muslims.'] },
  { id: 'rain', title: 'When the rain is held back (Istisqa)', kind: 'occasion', blurb: 'Seeking forgiveness brings rain and mercy.', quran: ['71:10-12', '7:96'], hadith: [],
    points: ['Drought is a reminder to turn back to Allah.', 'Nuh’s advice: seek forgiveness, and He sends rain, wealth and children.', 'Gratitude for water, not wasting it, and helping those who are affected.'] },
]

export const topicById = (id: string): Topic | undefined => TOPICS.find((t) => t.id === id)

// Parses "3:102" or "2:155-157".
export function parseRef(ref: string): { surah: number; from: number; to: number } | null {
  const m = /^(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/.exec(ref)
  if (!m) return null
  const surah = Number(m[1])
  const from = Number(m[2])
  const to = m[3] ? Number(m[3]) : from
  return surah >= 1 && surah <= 114 && from >= 1 && to >= from && to - from <= 12 ? { surah, from, to } : null
}

// ───────── the fixed parts of the Friday sermon ─────────
export const HAJAH_AR =
  'إِنَّ الْحَمْدَ لِلَّهِ، نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ، وَنَعُوذُ بِاللَّهِ مِنْ شُرُورِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللَّهُ فَلَا مُضِلَّ لَهُ، وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ، وَأَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.'
export const HAJAH_EN =
  'All praise is for Allah. We praise Him, seek His help and ask His forgiveness. We seek refuge in Allah from the evil of our own souls and from our bad deeds. Whoever Allah guides, none can misguide, and whoever He leaves astray, none can guide. I bear witness that there is no god but Allah alone, with no partner, and I bear witness that Muhammad is His servant and Messenger.'
export const HAJAH_VERSES = ['3:102', '4:1', '33:70-71']
export const AMMA_BA3D = 'أَمَّا بَعْدُ'
export const SECOND_OPENING_AR = 'الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ، وَأَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.'
export const SECOND_OPENING_EN = 'Much praise be to Allah, good and blessed. I bear witness that there is no god but Allah alone, and that Muhammad is His servant and Messenger.'
export const SALAWAT_VERSE = '33:56'
export const CLOSING_VERSE = '16:90'
export const CLOSING_AR = 'أَقُولُ قَوْلِي هَذَا، وَأَسْتَغْفِرُ اللَّهَ لِي وَلَكُمْ، فَاسْتَغْفِرُوهُ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ.'
export const CLOSING_EN = 'I say this, and I ask Allah’s forgiveness for myself and for you. So ask His forgiveness; He is the Forgiving, the Merciful.'

export const LENGTHS = [
  { minutes: 5, words: 650, label: 'Short — about 5 minutes' },
  { minutes: 10, words: 1300, label: 'Standard — about 10 minutes' },
  { minutes: 15, words: 1950, label: 'Long — about 15 minutes' },
] as const

export const AUDIENCES = [
  { id: 'general', label: 'Everyone' },
  { id: 'youth', label: 'Young people' },
  { id: 'families', label: 'Families' },
  { id: 'new', label: 'New Muslims' },
] as const
export type AudienceId = (typeof AUDIENCES)[number]['id']

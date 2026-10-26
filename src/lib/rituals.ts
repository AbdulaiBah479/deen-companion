// Islamic rituals and special prayers: what they are, when they are done, how, and where it comes from.
// Every hadith pinned here is from Sahih al-Bukhari or Sahih Muslim and is checked against the bundled text by tests/rituals.test.mts
// (the number must exist and contain the key word), so the link under each ritual opens the real hadith. The steps summarise what
// scholars widely agree on; where the schools differ, the "notes" say so. This is a learning aid, not a fatwa: ask a qualified scholar
// about your own situation.

export type HadithPin = { book: 'bukhari' | 'muslim'; number: number; must: string }
export type Group = 'Seeking guidance and help' | 'Special prayers' | 'Voluntary prayers' | 'Life events' | 'Everyday worship'

export type Ritual = {
  id: string
  title: string
  titleAr: string
  icon: string
  group: Group
  summary: string
  when: string
  steps: string[]
  notes?: string[]
  quran?: string[] // "3:159"
  hadith: HadithPin[]
}

export const GROUPS: Group[] = ['Seeking guidance and help', 'Special prayers', 'Voluntary prayers', 'Life events', 'Everyday worship']

export const RITUALS: Ritual[] = [
  {
    id: 'istikhara', title: 'Istikhara — asking Allah to guide a decision', titleAr: 'صلاة الاستخارة', icon: '🧭', group: 'Seeking guidance and help',
    summary: 'A short prayer and dua in which you ask Allah, who knows what you do not, to choose what is best for you and to make it easy, or to turn you away from what is not.',
    when: 'When you must decide something that is permitted (a marriage proposal, a job, a move, a trip) and you are unsure. The Prophet ﷺ taught it for “each and every matter”.',
    steps: [
      'Think the matter through and ask people you trust who have knowledge and experience; Allah praises those who consult one another.',
      'Make wudu, and pray two voluntary rak‘ahs (not at a time when prayer is forbidden). This is separate from the obligatory prayers.',
      'Then say the istikhara dua, the words taught in the hadith below (in Arabic if you can; you may also say it in your own language). Name your matter in the dua where it says “this matter”.',
      'Go ahead with what is easiest and what your heart settles on, and trust Allah. Repeat the istikhara if you are still unsure.',
      'Accept the outcome: if the matter is made easy, it is a good; if it is blocked, trust that Allah turned you from something worse.',
    ],
    notes: [
      'Istikhara does not depend on seeing a dream or feeling a sign. The hadith describes asking, then acting and trusting.',
      'Scholars differ on whether the dua is said before or after the final salam of the two rak‘ahs; both are accepted.',
      'It is for permitted matters. You do not make istikhara about whether to do something obligatory or forbidden.',
    ],
    quran: ['3:159'],
    hadith: [{ book: 'bukhari', number: 1166, must: 'Istikhara' }],
  },
  {
    id: 'istisqa', title: 'Prayer for rain (Istisqa)', titleAr: 'صلاة الاستسقاء', icon: '🌧️', group: 'Special prayers',
    summary: 'When rain is held back, the community turns to Allah in humility, with repentance, charity, prayer and dua, asking Him for rain.',
    when: 'In a drought or when rain is scarce. The Prophet ﷺ also asked for rain in the Friday sermon and in supplication outside prayer.',
    steps: [
      'Turn back to Allah first: seek forgiveness, repent of sins, put right wrongs to others, and give charity. Nuh عليه السلام told his people that seeking forgiveness brings rain.',
      'The imam announces a day, and people go out humbly (in plain clothes, with calm hearts) to an open prayer ground (musalla).',
      'The imam leads two rak‘ahs, reciting aloud.',
      'There is a sermon with much istighfar and dua. The imam faces the qiblah, raises his hands and asks Allah for rain; the people say ameen.',
      'It is reported that the Prophet ﷺ turned his cloak over, as a sign of hoping for a change of condition.',
      'Afterwards, thank Allah when the rain comes and do not waste water.',
    ],
    notes: [
      'The order of the sermon and the prayer is reported both ways; scholars allow either.',
      'Most scholars hold the congregational two-rak‘ah prayer to be a sunnah. Abu Hanifa held that seeking forgiveness and dua is what is called for, without a congregational prayer; the other schools do pray.',
      'You can also ask for rain in your own dua at any time, as the people did in the Friday sermon in the hadith below.',
    ],
    quran: ['71:10-12', '7:96'],
    hadith: [
      { book: 'bukhari', number: 1005, must: 'Istisqa' },
      { book: 'bukhari', number: 6343, must: 'Musalla' },
      { book: 'bukhari', number: 1015, must: 'rain' },
    ],
  },
  {
    id: 'kusuf', title: 'Eclipse prayer (Salat al-Kusuf)', titleAr: 'صلاة الكسوف', icon: '🌒', group: 'Special prayers',
    summary: 'When the sun or the moon is eclipsed, Muslims remember Allah, pray, give charity and ask forgiveness until it clears. An eclipse has nothing to do with anyone’s birth or death.',
    when: 'During a solar or lunar eclipse, until it ends.',
    steps: [
      'The call “As-salatu jami‘ah” (the prayer is gathering) is made. There is no adhan or iqamah.',
      'Pray two rak‘ahs in congregation (it can also be prayed alone). In each rak‘ah there are two standings and two bowings: stand long reciting, bow long, rise and stand long again reciting, bow again, then prostrate twice as usual.',
      'Recite long surahs in a quiet, humble way, bowing and prostrating for a long time.',
      'After the prayer the imam gives a short sermon reminding people to remember Allah, give charity, and seek forgiveness.',
      'Keep making dua, takbir and charity until the eclipse has cleared.',
    ],
    notes: ['Scholars differ on the exact method (some allow a single bowing in each rak‘ah) and on whether the lunar eclipse is prayed in congregation; the method with two bowings is the best-attested.'],
    hadith: [
      { book: 'bukhari', number: 1044, must: 'Qiyam' },
      { book: 'bukhari', number: 1060, must: 'eclipse' },
    ],
  },
  {
    id: 'janazah', title: 'Funeral prayer (Janazah) and what follows', titleAr: 'صلاة الجنازة', icon: '🕊️', group: 'Special prayers',
    summary: 'Washing, shrouding, praying over and burying a Muslim is a shared duty of the community. The funeral prayer is a dua for the one who has died, said standing, with no bowing or prostration.',
    when: 'When a Muslim has died, as soon as the washing and shrouding are done. The community should hurry to bury, and may pray at the grave later if they missed it.',
    steps: [
      'Stand in rows behind the imam, with the body in front of him. Intend the funeral prayer for the deceased.',
      'First takbir (Allahu akbar). Many scholars then say the opening praise and recite Surat al-Fatiha; Ibn ‘Abbas did, and said it is the sunnah.',
      'Second takbir, then send blessings on the Prophet ﷺ (as in the tashahhud).',
      'Third takbir, then make dua for the deceased and for all the Muslims: ask Allah to forgive him, have mercy on him, pardon him, and make his grave wide and bright.',
      'Fourth takbir, a short pause or dua, and then the salam to the right (and, in some schools, to the left).',
      'Then follow the funeral to the grave if you can, and stay until the burial. Console the family and help them, for example with food.',
    ],
    notes: [
      'The exact words and whether to say a fifth takbir differ between schools; four takbirs is the most widely followed.',
      'A prayer said in absentia (for someone who died far away) is reported for the Negus, and scholars differ on when it applies.',
    ],
    hadith: [
      { book: 'bukhari', number: 1245, must: 'Najashi' },
      { book: 'bukhari', number: 1335, must: 'Fatiha' },
      { book: 'bukhari', number: 1325, must: 'funeral' },
      { book: 'bukhari', number: 1284, must: 'takes' },
    ],
  },
  {
    id: 'eid', title: 'The Eid prayer', titleAr: 'صلاة العيد', icon: '🌙', group: 'Special prayers',
    summary: 'Two joyful days each year, Eid al-Fitr and Eid al-Adha, begin with a congregational prayer in the open, followed by a sermon, and are days of food, family and charity.',
    when: 'Morning of 1 Shawwal (Eid al-Fitr) and 10 Dhul Hijjah (Eid al-Adha), after the sun has risen.',
    steps: [
      'Wash (ghusl), wear your best clothes and perfume, and say the takbir on the way.',
      'On Eid al-Fitr, eat a few dates before going out; on Eid al-Adha, it is the practice to eat after the prayer. Pay zakat al-fitr before the Eid prayer.',
      'Go to the prayer ground (musalla) with your family. Women, girls, and even menstruating women are encouraged to attend, and those who are menstruating stay out of the prayer rows but share in the good and the dua.',
      'The prayer has two rak‘ahs, with no adhan or iqamah, and extra takbirs. The number of extra takbirs differs between the schools.',
      'The sermon is after the prayer. Listen, then greet each other and return by a different way, as the Prophet ﷺ did.',
    ],
    notes: ['Scholars differ on whether the Eid prayer is obligatory on every adult or a strongly emphasised sunnah.'],
    hadith: [
      { book: 'bukhari', number: 956, must: 'prayer' },
      { book: 'bukhari', number: 953, must: 'dates' },
      { book: 'bukhari', number: 986, must: 'different' },
      { book: 'bukhari', number: 981, must: 'menstruating' },
    ],
  },
  {
    id: 'khawf', title: 'Prayer in fear or danger (Salat al-Khawf)', titleAr: 'صلاة الخوف', icon: '🛡️', group: 'Special prayers',
    summary: 'Even in danger, prayer is not dropped. The Quran and the Prophet ﷺ show how a group can pray in turns so that some pray while others stand guard.',
    when: 'In a real danger, such as war, when the whole group cannot pray together safely.',
    steps: [
      'The imam divides the group in two. One group stands behind him to pray; the other faces the danger.',
      'The first group prays one rak‘ah with the imam, completes the prayer alone and goes to guard.',
      'The second group joins, prays the imam’s remaining rak‘ah, and finishes their own prayer.',
      'If the danger is greater still, people pray on foot or riding, facing any direction, with gestures.',
    ],
    notes: ['Several ways are reported from the Prophet ﷺ and scholars allow whichever suits the situation.'],
    quran: ['4:102', '2:239'],
    hadith: [{ book: 'bukhari', number: 4535, must: 'Khauf' }],
  },
  {
    id: 'qiyam', title: 'The night prayer (Qiyam, Tahajjud) and Witr', titleAr: 'قيام الليل والوتر', icon: '🌌', group: 'Voluntary prayers',
    summary: 'Prayer in the night after sleeping, when most people are asleep, is among the most loved voluntary acts. It is closed with Witr, an odd number of rak‘ahs.',
    when: 'Any time between Isha and Fajr; the best time is the last third of the night, when Allah draws near to answer.',
    steps: [
      'Sleep a little first if you can; tahajjud is prayer after waking, and Qiyam in general is standing in the night.',
      'Begin with two short rak‘ahs, then pray two by two, as long as you like.',
      'Recite what you know with calm and reflection; make dua in prostration and in the last third of the night.',
      'Finish with Witr, one rak‘ah, or three, five or more as you like, before Fajr.',
      'If you fear sleeping through Fajr, pray Witr after Isha before you sleep.',
    ],
    quran: ['17:79', '73:1-6'],
    hadith: [
      { book: 'bukhari', number: 990, must: 'night' },
      { book: 'bukhari', number: 1145, must: 'third' },
      { book: 'muslim', number: 1770, must: 'hour' },
    ],
  },
  {
    id: 'duha', title: 'The forenoon prayer (Duha)', titleAr: 'صلاة الضحى', icon: '☀️', group: 'Voluntary prayers',
    summary: 'A voluntary prayer in the morning after the sun has risen, counted as charity for the body’s joints.',
    when: 'From about fifteen minutes after sunrise until shortly before Dhuhr.',
    steps: ['Make wudu and intend the Duha prayer.', 'Pray at least two rak‘ahs; the Prophet ﷺ is reported to have prayed more (for example eight on the day Makkah was opened).', 'Say the salam after every two rak‘ahs.'],
    hadith: [
      { book: 'bukhari', number: 1981, must: 'Duha' },
      { book: 'bukhari', number: 1103, must: 'Duha' },
      { book: 'bukhari', number: 2989, must: 'joint' },
    ],
  },
  {
    id: 'tahiyya', title: 'Greeting the mosque (Tahiyyat al-Masjid)', titleAr: 'تحية المسجد', icon: '🕌', group: 'Voluntary prayers',
    summary: 'Two rak‘ahs prayed on entering a mosque, before sitting down.',
    when: 'Whenever you enter a mosque at a time when prayer is allowed, including during the Friday sermon (short and light).',
    steps: ['Enter with the right foot and say the dua for entering a mosque: “O Allah, open for me the doors of Your mercy.”', 'Before you sit, pray two rak‘ahs.', 'If the obligatory prayer is already being prayed, join it; that takes the place of the greeting.'],
    hadith: [
      { book: 'bukhari', number: 444, must: 'two' },
      { book: 'muslim', number: 1652, must: 'doors' },
    ],
  },
  {
    id: 'wudu', title: 'Wudu — purification for prayer', titleAr: 'الوضوء', icon: '💧', group: 'Everyday worship',
    summary: 'Washing the face, arms, head and feet in a set order. It is a condition for prayer, and the Prophet ﷺ taught that sins fall away with the water.',
    when: 'Before prayer, touching the Quran (according to most scholars), and whenever you have broken your wudu.',
    steps: [
      'Intend to purify yourself for prayer and say Bismillah.',
      'Wash both hands up to the wrists three times.',
      'Rinse the mouth and clean the nose with water, three times.',
      'Wash the face three times, then the right arm and then the left up to and including the elbows, three times each.',
      'Wipe the head once with wet hands, including the ears.',
      'Wash the right foot and then the left up to and including the ankles, three times each.',
      'Say the shahadah and the dua after wudu; then pray two rak‘ahs with a focused heart if you wish.',
    ],
    notes: ['What breaks wudu and some small details differ between the schools.'],
    hadith: [
      { book: 'bukhari', number: 159, must: 'Uthman' },
      { book: 'bukhari', number: 164, must: 'ablution' },
    ],
  },
  {
    id: 'sujud', title: 'Prostration of recitation and of forgetfulness', titleAr: 'سجود التلاوة والسهو', icon: '🤲', group: 'Everyday worship',
    summary: 'Two extra prostrations that fix or beautify a prayer: one when you recite or hear a verse of prostration, and one when you forget something in the prayer.',
    when: 'Recitation: when you reach a verse of prostration in the Quran. Forgetfulness: when you add, miss, or doubt something in your prayer.',
    steps: [
      'Recitation: say takbir, go down in one prostration, say “Subhana rabbiyal-a‘la”, make dua, and rise with a takbir (some scholars add a salam).',
      'Forgetfulness: if you forgot, for example, the first sitting, finish the prayer and make two prostrations, either before or after the final salam.',
      'Then say the salam.',
    ],
    notes: ['Which verses count, whether the prostration is obligatory or recommended, and whether to prostrate before or after the salam differ between the schools.'],
    hadith: [
      { book: 'bukhari', number: 1069, must: 'prostrat' },
      { book: 'bukhari', number: 1224, must: 'rak' },
    ],
  },
  {
    id: 'travel', title: 'Prayer and dua when travelling', titleAr: 'صلاة المسافر', icon: '🧳', group: 'Everyday worship',
    summary: 'A traveller may shorten the four-rak‘ah prayers to two, and the Prophet ﷺ taught a dua to say on setting out.',
    when: 'On a journey of the distance scholars define (about 80 km or more), and while you are away.',
    steps: [
      'When you mount your vehicle, say Bismillah and Allahu akbar, then the dua of travel: “Glory be to Him who has subjected this to us…”.',
      'Shorten Dhuhr, Asr and Isha to two rak‘ahs each. Fajr and Maghrib stay the same.',
      'In some situations the traveller may combine Dhuhr with Asr and Maghrib with Isha.',
    ],
    notes: ['The minimum distance, how long you may stay and still shorten, and when to combine differ between the schools. Ask a scholar about your journey.'],
    hadith: [
      { book: 'muslim', number: 3275, must: 'journey' },
      { book: 'bukhari', number: 1089, must: 'shortened' },
      { book: 'bukhari', number: 1080, must: 'shortened' },
    ],
  },
  {
    id: 'newborn', title: 'Welcoming a newborn: tahnik, naming and ‘aqiqah', titleAr: 'استقبال المولود', icon: '👶', group: 'Life events',
    summary: 'When a child is born, parents thank Allah, give the child a good name, and sacrifice an animal and feed others on the child’s behalf.',
    when: 'At birth and in the first days; the ‘aqiqah is traditionally on the seventh day.',
    steps: [
      'Thank Allah, and receive congratulations with a dua.',
      'Tahnik: a pious person softens a date and rubs a little on the baby’s palate, making dua for the child, as the Companions brought their newborns to the Prophet ﷺ.',
      'Give the child a good name, one with a good meaning.',
      '‘Aqiqah: sacrifice an animal for the child (two for a boy and one for a girl is the more commonly preferred view), share the meat with family and the poor, and shave the baby’s head.',
    ],
    notes: ['Scholars differ on whether the ‘aqiqah is a strongly recommended sunnah or obligatory, and on the numbers and timing.'],
    hadith: [
      { book: 'bukhari', number: 5472, must: 'Aqiqa' },
      { book: 'bukhari', number: 1502, must: 'Tahnik' },
    ],
  },
  {
    id: 'marriage', title: 'Marriage: the walima and good wishes', titleAr: 'الزواج والوليمة', icon: '💍', group: 'Life events',
    summary: 'Marriage is celebrated with a modest feast and prayers for the couple. The groom gives a mahr (marriage gift) to the bride.',
    when: 'At and after the marriage contract.',
    steps: [
      'The marriage is made with the consent of both people, a guardian for the bride, witnesses, and a mahr paid to the bride.',
      'Hold a walima (a wedding meal), however simple. The Prophet ﷺ told a Companion to hold one even with a single sheep.',
      'Congratulate the couple with: “Barak Allahu laka wa baraka ‘alayka wa jama‘a baynakuma fi khayr” (may Allah bless you, bless you, and join you together in good).',
      'Accept invitations to a walima, and keep it free of waste and show.',
    ],
    quran: ['30:21', '4:4'],
    hadith: [
      { book: 'bukhari', number: 5167, must: 'banquet' },
      { book: 'bukhari', number: 5155, must: 'married' },
    ],
  },
  {
    id: 'sick', title: 'Visiting the sick and consoling the grieving', titleAr: 'عيادة المريض والتعزية', icon: '🤍', group: 'Life events',
    summary: 'Visiting the sick, following the funeral, and comforting those who have lost someone are among the rights a Muslim owes to another.',
    when: 'When someone is ill, and when someone has died.',
    steps: [
      'Visit the sick, keep it short and gentle, ask how they are, and make dua for healing (see the Ruqyah section for the supplications from the Quran and Sunnah).',
      'When someone has died, go to the family, bring food, and help with what needs doing.',
      'Console them with the words the Prophet ﷺ said: “Whatever Allah takes is for Him, and whatever He gives is for Him, and everything with Him has a fixed term, so be patient and hope for Allah’s reward.”',
      'Remind them gently of Allah’s mercy, and avoid loud wailing and anything that adds to grief.',
    ],
    quran: ['2:155-157'],
    hadith: [
      { book: 'bukhari', number: 1240, must: 'sick' },
      { book: 'bukhari', number: 1284, must: 'takes' },
    ],
  },
]

export const ritualById = (id: string) => RITUALS.find((r) => r.id === id)

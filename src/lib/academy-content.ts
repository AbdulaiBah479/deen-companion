// The Academy: complete beginner-to-confident courses in Arabic and Islamic knowledge, for children, students and anyone. Each course is
// a sequence of short lessons (a few slides and a quiz), shown by the same lesson player as the rest of Learn, with a certificate when
// every lesson has been passed. Everything here is static and small, so it is saved for offline use.
// The Arabic is written with full vowels and checked by tests/academy.test.mts for structure; the facts are the widely agreed ones,
// and where scholars differ the lesson says so. A study aid, not a replacement for a teacher.
import { mcq, type Lesson, type PathMeta, type Question, type Slide } from './learn-content'

export type Row = [ar: string, tr: string, en: string]

const vocab = (title: string, rows: Row[], body?: string): Slide => ({ title, body, bullets: rows.map(([ar, tr, en]) => `${ar}  —  ${tr}  —  ${en}`) })
const slide = (title: string, body: string, extra: Partial<Slide> = {}): Slide => ({ title, body, ...extra })
const q = (id: string, prompt: string, answer: string, wrongs: string[], extra: Partial<Question> = {}) => mcq(id, prompt, answer, wrongs, extra)

// Questions from a word list: "What does this mean?" and "Which word means …?" for the first `n` rows.
function vocabQuiz(id: string, rows: Row[], n = 5): Question[] {
  const en = rows.map((r) => r[2])
  const ar = rows.map((r) => r[0])
  const out: Question[] = []
  for (let i = 0; i < Math.min(n, rows.length); i++) {
    if (i % 2 === 0) out.push(q(`${id}-a${i}`, 'What does this word mean?', rows[i][2], en, { promptArabic: rows[i][0], explain: `${rows[i][0]} (${rows[i][1]}) means “${rows[i][2]}”.` }))
    else out.push(q(`${id}-b${i}`, `Which word means “${rows[i][2]}”?`, rows[i][0], ar, { optionsArabic: true, explain: `“${rows[i][2]}” is ${rows[i][0]} (${rows[i][1]}).` }))
  }
  return out
}
const lesson = (id: string, title: string, summary: string, slides: Slide[], quiz: Question[]): Lesson => ({ id, title, summary, slides, quiz })

// ───────────────────────── Kids: first Arabic words ─────────────────────────

const GREET: Row[] = [
  ['السَّلَامُ عَلَيْكُمْ', 'as-salāmu ‘alaykum', 'peace be upon you'],
  ['وَعَلَيْكُمُ السَّلَامُ', 'wa ‘alaykumus-salām', 'and upon you peace'],
  ['مَرْحَبًا', 'marḥaban', 'hello'],
  ['صَبَاحُ الْخَيْرِ', 'ṣabāḥul-khayr', 'good morning'],
  ['مَسَاءُ الْخَيْرِ', 'masā’ul-khayr', 'good evening'],
  ['شُكْرًا', 'shukran', 'thank you'],
  ['عَفْوًا', '‘afwan', 'you are welcome'],
  ['مَعَ السَّلَامَةِ', 'ma‘as-salāmah', 'goodbye'],
]
const NUMS: Row[] = [
  ['وَاحِد', 'wāḥid', 'one'], ['اثْنَان', 'ithnān', 'two'], ['ثَلَاثَة', 'thalātha', 'three'], ['أَرْبَعَة', 'arba‘a', 'four'], ['خَمْسَة', 'khamsa', 'five'],
  ['سِتَّة', 'sitta', 'six'], ['سَبْعَة', 'sab‘a', 'seven'], ['ثَمَانِيَة', 'thamāniya', 'eight'], ['تِسْعَة', 'tis‘a', 'nine'], ['عَشَرَة', '‘ashara', 'ten'],
]
const COLORS: Row[] = [
  ['أَحْمَر', 'aḥmar', 'red'], ['أَزْرَق', 'azraq', 'blue'], ['أَخْضَر', 'akhḍar', 'green'], ['أَصْفَر', 'aṣfar', 'yellow'], ['أَبْيَض', 'abyaḍ', 'white'],
  ['أَسْوَد', 'aswad', 'black'], ['بُرْتُقَالِيّ', 'burtuqālī', 'orange'], ['وَرْدِيّ', 'wardī', 'pink'], ['بُنِّيّ', 'bunnī', 'brown'],
]
const FAMILY: Row[] = [
  ['أَب', 'ab', 'father'], ['أُمّ', 'umm', 'mother'], ['أَخ', 'akh', 'brother'], ['أُخْت', 'ukht', 'sister'], ['جَدّ', 'jadd', 'grandfather'],
  ['جَدَّة', 'jadda', 'grandmother'], ['ابْن', 'ibn', 'son'], ['بِنْت', 'bint', 'daughter'],
]
const ANIMALS: Row[] = [
  ['قِطَّة', 'qiṭṭa', 'cat'], ['كَلْب', 'kalb', 'dog'], ['حِصَان', 'ḥiṣān', 'horse'], ['جَمَل', 'jamal', 'camel'], ['طَائِر', 'ṭā’ir', 'bird'],
  ['سَمَكَة', 'samaka', 'fish'], ['أَسَد', 'asad', 'lion'], ['فِيل', 'fīl', 'elephant'], ['خَرُوف', 'kharūf', 'sheep'],
]
const THINGS: Row[] = [
  ['مَاء', 'mā’', 'water'], ['خُبْز', 'khubz', 'bread'], ['حَلِيب', 'ḥalīb', 'milk'], ['تَمْر', 'tamr', 'dates'], ['تُفَّاح', 'tuffāḥ', 'apple'],
  ['بَيْت', 'bayt', 'house'], ['بَاب', 'bāb', 'door'], ['كِتَاب', 'kitāb', 'book'], ['قَلَم', 'qalam', 'pen'], ['مَدْرَسَة', 'madrasa', 'school'], ['مَسْجِد', 'masjid', 'mosque'],
]
const BODY: Row[] = [
  ['رَأْس', 'ra’s', 'head'], ['عَيْن', '‘ayn', 'eye'], ['أُذُن', 'udhun', 'ear'], ['أَنْف', 'anf', 'nose'], ['فَم', 'fam', 'mouth'], ['يَد', 'yad', 'hand'], ['قَلْب', 'qalb', 'heart'],
]

export const KIDS_ARABIC: Lesson[] = [
  lesson('ka-greet', 'Hello and thank you', 'The words Muslims say to each other every day.', [
    slide('Salām!', 'The best greeting is the Muslim greeting. When someone says it, we answer with the same or better.', { arabic: 'السَّلَامُ عَلَيْكُمْ', big: true, transliteration: 'as-salāmu ‘alaykum', speak: 'السَّلَامُ عَلَيْكُمْ' }),
    vocab('Say it in Arabic', GREET),
  ], vocabQuiz('ka-greet', GREET, 6)),
  lesson('ka-numbers', 'Counting 1 to 10', 'Count from one to ten in Arabic.', [vocab('Numbers', NUMS, 'Count them out loud, with your fingers!')], vocabQuiz('ka-numbers', NUMS, 6)),
  lesson('ka-colors', 'Colours', 'Name the colours around you.', [vocab('Colours', COLORS, 'Look around the room. How many of these can you see?')], vocabQuiz('ka-colors', COLORS, 6)),
  lesson('ka-family', 'My family', 'Mum, dad, brothers, sisters and grandparents.', [vocab('Family', FAMILY, 'Allah tells us to be kind to our parents.')], vocabQuiz('ka-family', FAMILY, 6)),
  lesson('ka-animals', 'Animals', 'Animals that are mentioned in the Quran and around us.', [vocab('Animals', ANIMALS, 'The camel, the horse, the sheep and the fish are all mentioned in the Quran.')], vocabQuiz('ka-animals', ANIMALS, 6)),
  lesson('ka-things', 'At home and school', 'Things you see every day.', [vocab('Things', THINGS)], vocabQuiz('ka-things', THINGS, 7)),
  lesson('ka-body', 'My body', 'The parts of the body, with a thank-you to Allah.', [vocab('Body', BODY, 'When we look in the mirror we can say: Alḥamdulillāh, thank You Allah for making me well.')], vocabQuiz('ka-body', BODY, 6)),
]

// ───────────────────────── Kids: my Islam ─────────────────────────

export const KIDS_ISLAM: Lesson[] = [
  lesson('ki-allah', 'Who is Allah?', 'Our Creator, who loves us and is always near.', [
    slide('Allah is One', 'Allah made everything: the sky, the sea, the trees, animals and you. He is One. He has no partner, no children and no parents. We worship only Him.', { arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', transliteration: 'Qul huwa llāhu aḥad' }),
    slide('Allah is kind', 'Allah is Ar-Raḥmān and Ar-Raḥīm, the Most Kind and the Most Merciful. He hears us when we ask Him, and He sees us always. That is why we say “Bismillāh” when we start something.'),
  ], [
    q('ki-allah1', 'How many Gods are there?', 'One: Allah', ['Two', 'Three', 'Many']),
    q('ki-allah2', 'What do we say when we start something good?', 'Bismillāh', ['Shukran', 'Marḥaban', 'Ma‘as-salāmah']),
    q('ki-allah3', 'Who made the sky and the sea?', 'Allah', ['The sun', 'The moon', 'Nobody']),
    q('ki-allah4', 'Ar-Raḥīm means…', 'The Most Merciful', ['The Strongest', 'The Smallest', 'The Fastest']),
  ]),
  lesson('ki-prophet', 'Our Prophet Muhammad ﷺ', 'The kindest man and the last messenger.', [
    slide('The last Prophet', 'Muhammad ﷺ was born in Makkah. He was honest and kind to everyone, even to people who were unkind to him. People called him “al-Amīn”, the Trustworthy. Allah sent him with the Quran to teach everyone the right way.'),
    slide('How we love him', 'When we hear his name we say “ṣallallāhu ‘alayhi wa sallam” (peace and blessings of Allah be upon him), and we try to be like him: honest, kind and generous.', { arabic: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ', transliteration: 'ṣallallāhu ‘alayhi wa sallam' }),
  ], [
    q('ki-prophet1', 'Where was Prophet Muhammad ﷺ born?', 'Makkah', ['Cairo', 'London', 'Istanbul']),
    q('ki-prophet2', 'What did people call him because he was honest?', 'Al-Amīn (the Trustworthy)', ['The Strongest', 'The Richest', 'The Tallest']),
    q('ki-prophet3', 'Which book did Allah send with him?', 'The Quran', ['The Atlas', 'A storybook', 'A cookbook']),
    q('ki-prophet4', 'What do we say after his name?', 'Ṣallallāhu ‘alayhi wa sallam', ['Bismillāh', 'Shukran', 'Marḥaban']),
  ]),
  lesson('ki-pillars', 'The five pillars', 'Five big things every Muslim does.', [
    slide('Five pillars', 'Islam is like a house held up by five pillars:', { bullets: ['1. Shahādah: saying that there is no god but Allah and Muhammad ﷺ is His Messenger', '2. Ṣalāh: praying five times a day', '3. Zakāh: giving to people who need help', '4. Ṣawm: fasting in Ramadan', '5. Ḥajj: visiting the Kaaba in Makkah, for those who can'] }),
  ], [
    q('ki-pillars1', 'How many pillars does Islam have?', 'Five', ['Three', 'Seven', 'Ten']),
    q('ki-pillars2', 'How many times a day do we pray?', 'Five', ['Two', 'Three', 'Ten']),
    q('ki-pillars3', 'Which pillar is fasting in Ramadan?', 'Ṣawm', ['Zakāh', 'Ḥajj', 'Ṣalāh']),
    q('ki-pillars4', 'Giving to people who need help is…', 'Zakāh', ['Ṣawm', 'Ḥajj', 'Shahādah']),
  ]),
  lesson('ki-manners', 'Good manners', 'How a Muslim child behaves.', [
    slide('Be kind', 'The Prophet ﷺ taught us: smiling at your brother is charity. Say “as-salāmu ‘alaykum”, say “please” and “thank you”, share, tell the truth, listen to your parents and teachers, and look after your things and other people’s feelings.', { bullets: ['Say Bismillāh before eating and Alḥamdulillāh after', 'Use your right hand to eat', 'Always tell the truth', 'Never laugh at someone', 'Help at home'] }),
  ], [
    q('ki-manners1', 'What do we say before eating?', 'Bismillāh', ['Alḥamdulillāh', 'Shukran', 'Astaghfirullāh']),
    q('ki-manners2', 'The Prophet ﷺ said that a smile is…', 'Charity', ['Silly', 'Rude', 'Expensive']),
    q('ki-manners3', 'We should always tell…', 'The truth', ['A joke', 'A secret lie', 'Nothing']),
    q('ki-manners4', 'Which hand do we use to eat?', 'The right hand', ['The left hand', 'Both feet', 'Any, it does not matter']),
  ]),
  lesson('ki-salah', 'Wudu and prayer', 'Getting clean and standing before Allah.', [
    slide('Wudu', 'Before we pray we wash with water, in this order: hands, mouth, nose, face, arms to the elbows, wipe the head and ears, and wash the feet. We start by saying “Bismillāh”.', { bullets: ['Hands', 'Mouth', 'Nose', 'Face', 'Arms', 'Wipe the head', 'Feet'] }),
    slide('Prayer', 'We face the Kaaba in Makkah (the Qiblah). We stand, bow, put our forehead on the ground and sit. The Prophet ﷺ said: “Pray as you have seen me praying.” The Basics page in the app shows what to say at every step.', { href: '/basics#pray' }),
  ], [
    q('ki-salah1', 'What do we do before we pray?', 'Wudu (wash)', ['Eat a big meal', 'Run around', 'Sleep']),
    q('ki-salah2', 'We pray facing…', 'The Kaaba in Makkah', ['The sun', 'The door', 'Our friend']),
    q('ki-salah3', 'What do we say at the start of wudu?', 'Bismillāh', ['Shukran', 'Marḥaban', 'Ma‘as-salāmah']),
    q('ki-salah4', 'What is the place we touch the ground with in prayer?', 'Our forehead', ['Our elbow', 'Our knee only', 'Our back']),
  ]),
  lesson('ki-ramadan', 'Ramadan and Eid', 'The month of fasting and the days of joy.', [
    slide('Ramadan', 'Ramadan is the month in which the Quran began to come down. Grown-ups fast from dawn to sunset, and we read the Quran, give charity and pray more. Children can fast a little at a time as they grow, when their parents say it is good for them.'),
    slide('Eid', 'There are two Eids: Eid al-Fiṭr after Ramadan and Eid al-Aḍḥā at the time of Hajj. We pray together, wear our best clothes, visit family, share food and say “Taqabbalallāhu minnā wa minkum” (may Allah accept it from us and you).', { arabic: 'تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ', transliteration: 'Taqabbalallāhu minnā wa minkum' }),
  ], [
    q('ki-ramadan1', 'What do Muslims do in Ramadan?', 'Fast from dawn to sunset', ['Stay up playing', 'Travel to the moon', 'Eat nothing for a year']),
    q('ki-ramadan2', 'What book began to come down in Ramadan?', 'The Quran', ['The Torah only', 'A newspaper', 'A diary']),
    q('ki-ramadan3', 'How many Eids do we have each year?', 'Two', ['One', 'Five', 'Twelve']),
    q('ki-ramadan4', 'Eid al-Fiṭr comes after…', 'Ramadan', ['Hajj', 'Muharram', 'Rajab']),
  ]),
]

// ───────────────────────── Arabic for beginners ─────────────────────────

export const ARABIC_1: Lesson[] = [
  lesson('a1-pronouns', 'I, you, he, she: the pronouns', 'The small words that start every sentence.', [
    vocab('Pronouns', [
      ['أَنَا', 'anā', 'I'], ['أَنْتَ', 'anta', 'you (male)'], ['أَنْتِ', 'anti', 'you (female)'], ['هُوَ', 'huwa', 'he'], ['هِيَ', 'hiya', 'she'],
      ['نَحْنُ', 'naḥnu', 'we'], ['أَنْتُمْ', 'antum', 'you (all, male)'], ['هُمْ', 'hum', 'they (male)'],
    ], 'Arabic has separate words for “you” to a man and to a woman.'),
  ], [
    q('a1-pro1', 'What does this word mean?', 'I', ['you (male)', 'he', 'we'], { promptArabic: 'أَنَا' }),
    q('a1-pro2', 'What does this word mean?', 'she', ['he', 'they', 'you (female)'], { promptArabic: 'هِيَ' }),
    q('a1-pro3', 'Which word means “we”?', 'نَحْنُ', ['هُوَ', 'أَنَا', 'أَنْتِ'], { optionsArabic: true }),
    q('a1-pro4', 'You are speaking to a woman. Which “you” do you use?', 'أَنْتِ', ['أَنْتَ', 'هُوَ', 'نَحْنُ'], { optionsArabic: true }),
  ]),
  lesson('a1-nominal', 'Sentences without “is”', 'Arabic has no word for “is” or “am” in the present.', [
    slide('No “am / is / are”', 'To say “I am a Muslim” you just put the two words together: pronoun + word. This is called a nominal sentence.', { bullets: ['أَنَا مُسْلِمٌ — anā muslim — I am a Muslim', 'هُوَ طَالِبٌ — huwa ṭālib — he is a student', 'هِيَ مُعَلِّمَةٌ — hiya mu‘allima — she is a teacher'] }),
    slide('The ending “-un”', 'A word with no “the” in front usually ends with the sound “-un” (written with two small marks, tanwīn). It means “a / an”. In Arabic speech this ending is often dropped when you stop speaking.'),
  ], [
    q('a1-nom1', 'How do you say “I am a Muslim”?', 'أَنَا مُسْلِمٌ', ['أَنَا هُوَ', 'مُسْلِمٌ هِيَ', 'نَحْنُ أَنَا'], { optionsArabic: true }),
    q('a1-nom2', 'Is there a word for “is” in the Arabic present sentence?', 'No, you just join the words', ['Yes, “huwa”', 'Yes, “anā”', 'Yes, always “fī”']),
    q('a1-nom3', 'What does هِيَ مُعَلِّمَةٌ mean?', 'She is a teacher', ['He is a teacher', 'I am a student', 'We are teachers'], {}),
    q('a1-nom4', 'What does طَالِبٌ mean?', 'a student', ['a teacher', 'a book', 'a school']),
  ]),
  lesson('a1-article', 'The: al- and the sun letters', 'How to say “the”, and the letters that swallow the L.', [
    slide('Adding “the”', 'Put ال (al-) in front of a word to say “the”: كِتَابٌ (a book) becomes الْكِتَابُ (the book). After adding “the” the “-un” ending changes to “-u”.'),
    slide('Sun letters', 'Before 14 letters the “l” of al- is not pronounced; the letter is doubled instead. They are called sun letters, after شَمْس (sun): ت ث د ذ ر ز س ش ص ض ط ظ ل ن. So we say ash-shams, not al-shams.', { bullets: ['الشَّمْسُ — ash-shams — the sun', 'الرَّجُلُ — ar-rajul — the man', 'النُّورُ — an-nūr — the light'] }),
    slide('Moon letters', 'Before the other 14 letters (ا ب ج ح خ ع غ ف ق ك م ه و ي) the “l” is pronounced, as in الْقَمَرُ (al-qamar, the moon) and الْكِتَابُ (al-kitāb, the book).'),
  ], [
    q('a1-art1', 'How do you say “the book”?', 'الْكِتَابُ', ['كِتَابٌ', 'كِتَابَةٌ', 'كَاتِبٌ'], { optionsArabic: true }),
    q('a1-art2', 'How many sun letters are there?', '14', ['10', '28', '7']),
    q('a1-art3', 'Which is pronounced “ash-shams”?', 'الشَّمْسُ', ['الْقَمَرُ', 'الْكِتَابُ', 'الْبَيْتُ'], { optionsArabic: true }),
    q('a1-art4', 'Is ق (qāf) a sun letter or a moon letter?', 'Moon letter', ['Sun letter', 'Neither', 'Both']),
  ]),
  lesson('a1-gender', 'Masculine and feminine', 'Every noun is one or the other.', [
    slide('Adding ة', 'Many feminine words end in ة (tā’ marbūṭa, pronounced “-a”). To make a feminine from a masculine, add it: طَالِب → طَالِبَة (a female student), مُعَلِّم → مُعَلِّمَة, مُسْلِم → مُسْلِمَة.'),
    slide('Exceptions', 'Some feminine words do not end in ة, such as أُمّ (mother), أُخْت (sister, which has a ت), and مَدْرَسَة is feminine because of ة. Most things that come in pairs, like عَيْن (eye) and يَد (hand), are also feminine.'),
  ], [
    q('a1-gen1', 'Which is the female student?', 'طَالِبَة', ['طَالِب', 'كِتَاب', 'بَيْت'], { optionsArabic: true }),
    q('a1-gen2', 'What ending usually makes a word feminine?', 'ة', ['ن', 'ال', 'ب'], { optionsArabic: true }),
    q('a1-gen3', 'Is مَدْرَسَة (school) masculine or feminine?', 'Feminine', ['Masculine', 'Neither', 'Both']),
    q('a1-gen4', 'What is the feminine of مُسْلِم?', 'مُسْلِمَة', ['مُسْلِمُونَ', 'مَسْجِد', 'إِسْلَام'], { optionsArabic: true }),
  ]),
  lesson('a1-this', 'This and that', 'Pointing at things.', [
    vocab('Demonstratives', [['هَذَا', 'hādhā', 'this (masculine)'], ['هَذِهِ', 'hādhihi', 'this (feminine)'], ['ذَلِكَ', 'dhālika', 'that (masculine)'], ['تِلْكَ', 'tilka', 'that (feminine)']]),
    slide('Examples', 'Use هَذَا with masculine words and هَذِهِ with feminine ones.', { bullets: ['هَذَا كِتَابٌ — this is a book', 'هَذِهِ مَدْرَسَةٌ — this is a school', 'ذَلِكَ مَسْجِدٌ — that is a mosque', 'تِلْكَ سَيَّارَةٌ — that is a car'] }),
  ], [
    q('a1-this1', 'Which word means “this” for a masculine thing?', 'هَذَا', ['هَذِهِ', 'تِلْكَ', 'هُوَ'], { optionsArabic: true }),
    q('a1-this2', 'You point at a school (مَدْرَسَة, feminine). Which do you say?', 'هَذِهِ', ['هَذَا', 'ذَلِكَ', 'أَنَا'], { optionsArabic: true }),
    q('a1-this3', 'What does تِلْكَ mean?', 'that (feminine)', ['this (masculine)', 'that (masculine)', 'she']),
    q('a1-this4', 'What does هَذَا كِتَابٌ mean?', 'This is a book', ['That is a school', 'He is a book', 'This is a pen']),
  ]),
  lesson('a1-prep', 'Small words: in, from, to, on', 'The prepositions you will meet in every verse.', [
    vocab('Prepositions', [['فِي', 'fī', 'in'], ['مِنْ', 'min', 'from'], ['إِلَى', 'ilā', 'to'], ['عَلَى', '‘alā', 'on'], ['مَعَ', 'ma‘a', 'with'], ['عَنْ', '‘an', 'about / from'], ['بِـ', 'bi-', 'with, by'], ['لِـ', 'li-', 'for, to, belonging to']]),
    slide('In the Quran', 'These words are everywhere. “Bismillāh” is بِـ (with) + اسْمِ (the name of) + اللَّهِ (Allah). “Alḥamdu lillāh” has لِـ: all praise is for Allah.'),
  ], [
    q('a1-prep1', 'What does فِي mean?', 'in', ['from', 'to', 'with'], { promptArabic: 'فِي' }),
    q('a1-prep2', 'What does مِنْ mean?', 'from', ['in', 'on', 'with'], { promptArabic: 'مِنْ' }),
    q('a1-prep3', 'Which means “with”?', 'مَعَ', ['عَلَى', 'إِلَى', 'فِي'], { optionsArabic: true }),
    q('a1-prep4', 'The lām in لِلَّهِ (lillāh) means…', 'for / belonging to', ['from', 'in', 'on']),
  ]),
  lesson('a1-questions', 'Asking questions', 'Who, what, where, how.', [
    vocab('Question words', [['هَلْ', 'hal', 'is / do? (yes-or-no)'], ['مَا', 'mā', 'what'], ['مَنْ', 'man', 'who'], ['أَيْنَ', 'ayna', 'where'], ['كَيْفَ', 'kayfa', 'how'], ['لِمَاذَا', 'limādhā', 'why'], ['مَتَى', 'matā', 'when'], ['كَمْ', 'kam', 'how many']]),
    slide('Examples', 'Put the question word first.', { bullets: ['مَا اسْمُكَ؟ — mā ismuka — what is your name?', 'أَيْنَ الْمَسْجِدُ؟ — ayna l-masjid — where is the mosque?', 'كَيْفَ حَالُكَ؟ — kayfa ḥāluka — how are you?', 'هَلْ أَنْتَ طَالِبٌ؟ — hal anta ṭālib — are you a student?'] }),
  ], [
    q('a1-qs1', 'What does أَيْنَ mean?', 'where', ['who', 'when', 'why'], { promptArabic: 'أَيْنَ' }),
    q('a1-qs2', 'Which word starts a yes-or-no question?', 'هَلْ', ['مَنْ', 'كَمْ', 'مَتَى'], { optionsArabic: true }),
    q('a1-qs3', 'What does كَيْفَ حَالُكَ؟ ask?', 'How are you?', ['Where are you?', 'Who are you?', 'What is this?']),
    q('a1-qs4', 'What does مَنْ mean?', 'who', ['what', 'how many', 'where'], { promptArabic: 'مَنْ' }),
  ]),
  lesson('a1-plural', 'More than one: plurals', 'Three ways to make a plural.', [
    slide('Sound plurals', 'For people: masculine adds ـُونَ (-ūna) or ـِينَ (-īna); feminine adds ـَات (-āt). مُسْلِم → مُسْلِمُونَ (Muslims, men), مُسْلِمَة → مُسْلِمَات (Muslim women).'),
    slide('Broken plurals', 'Many common words change inside instead. These must be learned one by one:', { bullets: ['كِتَاب → كُتُب (book → books)', 'طَالِب → طُلَّاب (student → students)', 'بَيْت → بُيُوت (house → houses)', 'مَسْجِد → مَسَاجِد (mosque → mosques)'] }),
  ], [
    q('a1-pl1', 'What is the plural of كِتَاب (book)?', 'كُتُب', ['كِتَابَات', 'كَاتِبُونَ', 'كِتَابُونَ'], { optionsArabic: true }),
    q('a1-pl2', 'Which plural ending is for feminine people?', 'ـَات (-āt)', ['ـُونَ (-ūna)', 'ـِينَ (-īna)', 'ـَة (-a)']),
    q('a1-pl3', 'What is the plural of مَسْجِد?', 'مَسَاجِد', ['مَسْجِدُونَ', 'مَسْجِدَات', 'مُسْلِمُونَ'], { optionsArabic: true }),
    q('a1-pl4', 'Are most Arabic plurals fully regular?', 'No, many are “broken” and must be learned', ['Yes, always add -s', 'Yes, always add ة', 'There are no plurals']),
  ]),
  lesson('a1-verbs', 'Roots and verbs', 'The idea that unlocks the whole language.', [
    slide('Three-letter roots', 'Most Arabic words grow from a root of three letters. ك-ت-ب is the root of “writing”: كَتَبَ (he wrote), كِتَاب (book), كَاتِب (writer), مَكْتَب (office, desk), مَكْتَبَة (library).'),
    slide('Past and present', 'The past tense is built by adding endings to the root: كَتَبَ (he wrote), كَتَبَتْ (she wrote), كَتَبْتُ (I wrote). The present adds a prefix: يَكْتُبُ (he writes), أَكْتُبُ (I write).'),
    slide('Roots in the Quran', 'Knowing roots lets you recognise a word you have never seen. The root س-ج-د (to prostrate) gives سَجَدَ, سُجُود, مَسْجِد: mosque means “place of prostration”. The root ع-ل-م gives عِلْم (knowledge), عَالِم (scholar), مُعَلِّم (teacher).'),
  ], [
    q('a1-vb1', 'How many letters does a typical Arabic root have?', 'Three', ['Two', 'Five', 'Seven']),
    q('a1-vb2', 'What does كَتَبَ mean?', 'he wrote', ['he reads', 'he sits', 'he went'], { promptArabic: 'كَتَبَ' }),
    q('a1-vb3', 'Which word comes from the root س-ج-د?', 'مَسْجِد', ['مَدْرَسَة', 'كِتَاب', 'بَيْت'], { optionsArabic: true }),
    q('a1-vb4', 'What does أَكْتُبُ mean?', 'I write', ['he wrote', 'we write', 'you wrote'], { promptArabic: 'أَكْتُبُ' }),
  ]),
  lesson('a1-possess', 'My book, your book', 'Showing who something belongs to.', [
    slide('The idāfa', 'To say “the X of Y”, put the two nouns side by side, with no “of”. The first has no “the”. كِتَابُ الطَّالِبِ (kitābu ṭ-ṭālib) is “the student’s book”. بَيْتُ اللَّهِ (baytullāh) is “the house of Allah”.'),
    vocab('Attached pronouns', [['كِتَابِي', 'kitābī', 'my book'], ['كِتَابُكَ', 'kitābuka', 'your book (male)'], ['كِتَابُكِ', 'kitābuki', 'your book (female)'], ['كِتَابُهُ', 'kitābuhu', 'his book'], ['كِتَابُهَا', 'kitābuhā', 'her book'], ['كِتَابُنَا', 'kitābunā', 'our book']], 'Small endings stick to the noun to show the owner.'),
  ], [
    q('a1-po1', 'How do you say “my book”?', 'كِتَابِي', ['كِتَابُهَا', 'كِتَابُكَ', 'كِتَابُنَا'], { optionsArabic: true }),
    q('a1-po2', 'What does كِتَابُهَا mean?', 'her book', ['his book', 'my book', 'our book']),
    q('a1-po3', 'What does بَيْتُ اللَّهِ mean?', 'the house of Allah', ['the book of Allah', 'a mosque', 'Allah’s name']),
    q('a1-po4', 'In “the student’s book”, which noun has no “al-”?', 'The first one (the book)', ['The second one (the student)', 'Both', 'Neither']),
  ]),
]

// ───────────────────────── The life of the Prophet ﷺ ─────────────────────────

export const SEERAH: Lesson[] = [
  lesson('se-before', 'Arabia and the birth of the Prophet ﷺ', 'Makkah, the Kaaba and the Year of the Elephant.', [
    slide('Makkah', 'Makkah was a trading town around the Kaaba, which Ibrahim and Ismail عليهما السلام had built for the worship of One God. By then the people had filled it with idols. The Quraysh tribe guarded the Kaaba and led the trade.'),
    slide('The birth', 'Muhammad ﷺ was born in Makkah around 570 CE, in the year known as the Year of the Elephant, when Abraha’s army came to destroy the Kaaba and was turned back. His father ‘Abdullah died before his birth, and his mother Āminah when he was about six. His grandfather ‘Abdul-Muṭṭalib and then his uncle Abū Ṭālib cared for him.'),
  ], [
    q('se-b1', 'In which city was the Prophet ﷺ born?', 'Makkah', ['Madinah', 'Taif', 'Jerusalem']),
    q('se-b2', 'What year is he said to have been born in?', 'About 570 CE (the Year of the Elephant)', ['About 400 CE', 'About 700 CE', 'About 622 CE']),
    q('se-b3', 'Who was his mother?', 'Āminah', ['Khadījah', 'ʿĀʾishah', 'Fāṭimah']),
    q('se-b4', 'Who looked after him after his grandfather?', 'His uncle Abū Ṭālib', ['Abū Bakr', '‘Umar', 'Bilāl']),
  ]),
  lesson('se-youth', 'Al-Amīn and Khadījah', 'A trusted young man and a blessed marriage.', [
    slide('The Trustworthy', 'As a young man he worked as a trader and became known to all as al-Amīn (the Trustworthy) and aṣ-Ṣādiq (the Truthful). When the Quraysh rebuilt the Kaaba, they argued over who would set the Black Stone in place. They accepted Muhammad ﷺ as judge, and he placed it on a cloak carried by the leaders of each tribe together.'),
    slide('Marriage', 'At about 25 he married Khadījah bint Khuwaylid رضي الله عنها, a noble and successful businesswoman, who had seen his honesty in trade. She supported him all her life and was the first to believe in him.'),
  ], [
    q('se-y1', 'What was he known as before prophethood?', 'Al-Amīn (the Trustworthy)', ['Al-Malik (the King)', 'Al-Qawī (the Strong)', 'Al-Ghānī (the Rich)']),
    q('se-y2', 'Who did he marry?', 'Khadījah', ['Ḥafṣah', 'Zaynab', 'Ṣafiyyah']),
    q('se-y3', 'What was the quarrel at the rebuilding of the Kaaba about?', 'Who would place the Black Stone', ['Who owned the Kaaba', 'Who would lead the prayer', 'The price of stones']),
    q('se-y4', 'Who was the first to believe in him?', 'Khadījah', ['Abū Jahl', 'Abū Lahab', 'Heraclius']),
  ]),
  lesson('se-revelation', 'The first revelation', 'The cave of Ḥirā’ and the first word: Iqra’.', [
    slide('In the cave', 'He would retire to the cave of Ḥirā’ on Mount Nūr near Makkah to reflect. In the month of Ramadan, when he was about 40, the angel Jibrīl came to him and said: “Iqra’ — Read!” These were the first words of the Quran, 96:1–5. Frightened, he went home to Khadījah, who comforted him.', { arabic: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ', transliteration: 'Iqra’ bismi rabbikal-ladhī khalaq' }),
    slide('The first Muslims', 'The first to believe were Khadījah, his young cousin ‘Alī, his friend Abū Bakr, and his freed servant Zayd ibn Ḥārithah رضي الله عنهم. For about three years the call was made quietly.'),
  ], [
    q('se-r1', 'Where did the first revelation come?', 'In the cave of Ḥirā’', ['In the Kaaba', 'In Madinah', 'At Mount Uhud']),
    q('se-r2', 'Which angel brought the revelation?', 'Jibrīl', ['Mīkā’īl', 'Isrāfīl', 'Mālik']),
    q('se-r3', 'What was the first word revealed?', 'Iqra’ (Read)', ['Qul (Say)', 'Yā ayyuhan-nās (O people)', 'Alḥamd (Praise)']),
    q('se-r4', 'About how old was he at that time?', '40', ['25', '63', '12']),
  ]),
  lesson('se-makkah', 'The call and the persecution', 'Patience under pressure.', [
    slide('The open call', 'After three years of quiet calling, he stood on Mount Ṣafā and called the Quraysh to worship One God. Most refused. The poor and the weak who believed, like Bilāl and Sumayyah رضي الله عنهما, were tortured; Sumayyah was the first martyr of Islam. Some Muslims migrated to Abyssinia, where the just king, the Najāshī, protected them.'),
    slide('Years of hardship', 'The Quraysh boycotted the Prophet ﷺ’s clan for about three years. Then, in the same year, his wife Khadījah and his uncle and protector Abū Ṭālib died: it is called the Year of Sorrow. He went to Ṭā’if to call its people, who drove him out with stones, and he made a dua of patience.'),
  ], [
    q('se-m1', 'Who was the first martyr of Islam?', 'Sumayyah', ['Bilāl', 'Zayd', 'Ḥamzah']),
    q('se-m2', 'Where did some Muslims migrate to for safety first?', 'Abyssinia', ['Madinah', 'Persia', 'Syria']),
    q('se-m3', 'Which year is called the Year of Sorrow?', 'When Khadījah and Abū Ṭālib died', ['When Badr was fought', 'When the Quran was completed', 'When Makkah fell']),
    q('se-m4', 'Which city rejected him with stones?', 'Ṭā’if', ['Madinah', 'Jeddah', 'Yemen']),
  ]),
  lesson('se-miraj', 'The Night Journey', 'Al-Isrā’ and al-Mi‘rāj.', [
    slide('The journey', 'In one night Allah took the Prophet ﷺ from the Sacred Mosque in Makkah to al-Masjid al-Aqṣā in Jerusalem (al-Isrā’, Quran 17:1), and then up through the heavens (al-Mi‘rāj). There the five daily prayers were prescribed, first fifty and then reduced to five in number with the reward of fifty.'),
    slide('Why it matters', 'It came at the hardest time, after the Year of Sorrow, as a gift and a comfort. Abū Bakr believed it at once and was called aṣ-Ṣiddīq (the Truthful). Al-Aqṣā became the first Qiblah Muslims faced in prayer.'),
  ], [
    q('se-j1', 'What was prescribed on the night of al-Mi‘rāj?', 'The five daily prayers', ['Fasting', 'Zakat', 'Hajj']),
    q('se-j2', 'Where did the Isrā’ journey end before going up?', 'Al-Masjid al-Aqṣā', ['Madinah', 'Mount Hira', 'Egypt']),
    q('se-j3', 'Who was called aṣ-Ṣiddīq for believing it?', 'Abū Bakr', ['‘Umar', '‘Uthmān', '‘Alī']),
    q('se-j4', 'Which chapter of the Quran begins with this journey?', 'Al-Isrā’ (17)', ['Al-Baqarah (2)', 'Yūsuf (12)', 'Al-Kahf (18)']),
  ]),
  lesson('se-hijrah', 'The Hijrah to Madinah', 'The migration that started a calendar.', [
    slide('The migration', 'After the pledges of al-‘Aqabah with people of Yathrib, the Muslims quietly migrated. The Prophet ﷺ left last with Abū Bakr, hid in the cave of Thawr while the Quraysh searched for them, and arrived in 622 CE. Yathrib became Madīnat an-Nabī, Madinah.'),
    slide('Building a community', 'He built the Prophet’s Mosque, joined the Muhājirūn (those who migrated) with the Anṣār (the helpers of Madinah) as brothers, and set up an agreement that protected all the communities of the city. The Hijri calendar, which begins with this migration, was fixed in the time of ‘Umar رضي الله عنه.'),
  ], [
    q('se-h1', 'In what year did the Hijrah happen?', '622 CE', ['570 CE', '632 CE', '610 CE']),
    q('se-h2', 'Who travelled with him?', 'Abū Bakr', ['‘Alī only', 'Bilāl', 'Zayd']),
    q('se-h3', 'What are the Anṣār?', 'The helpers of Madinah', ['Those who migrated', 'The Quraysh', 'The angels']),
    q('se-h4', 'The Hijri calendar starts from…', 'The Hijrah', ['The birth of the Prophet', 'The first revelation', 'The conquest of Makkah']),
  ]),
  lesson('se-battles', 'Badr, Uhud and the Trench', 'The defence of the new community.', [
    slide('Badr', 'In Ramadan of 2 AH about 313 poorly equipped Muslims met a Quraysh army of about a thousand at Badr and, with Allah’s help, won. The Quran calls it the Day of the Criterion (al-Furqān).'),
    slide('Uhud and the Trench', 'At Uhud (3 AH) a group of archers left their post and the Muslims suffered losses, a lesson in obedience; Ḥamzah رضي الله عنه was martyred. In 5 AH the Quraysh and their allies besieged Madinah; the Muslims dug a trench on Salmān al-Fārisī’s advice and the siege failed.'),
  ], [
    q('se-w1', 'Roughly how many Muslims fought at Badr?', '313', ['30', '3,000', '30,000']),
    q('se-w2', 'In which battle did the archers leave their post?', 'Uhud', ['Badr', 'The Trench', 'Hunayn']),
    q('se-w3', 'Who suggested the trench?', 'Salmān al-Fārisī', ['Bilāl', 'Khālid', 'Abū Dharr']),
    q('se-w4', 'What does al-Furqān mean?', 'The Criterion (that separates right and wrong)', ['The Trench', 'The Journey', 'The Treaty']),
  ]),
  lesson('se-hudaybiyyah', 'The treaty of Ḥudaybiyyah', 'Peace that opened the way.', [
    slide('The treaty', 'In 6 AH about 1,400 Muslims set out for Umrah. The Quraysh stopped them at Ḥudaybiyyah. The treaty had hard terms, and many Companions were upset, but the Prophet ﷺ accepted. The Quran called it a clear victory (48:1): in the calm that followed, Islam spread faster than ever.'),
    slide('Letters to the world', 'He wrote to rulers inviting them to Islam, among them Heraclius of Byzantium, Khosrow of Persia, and the Najāshī of Abyssinia.'),
  ], [
    q('se-d1', 'What was the Muslims’ aim when they went to Ḥudaybiyyah?', 'To perform Umrah', ['To fight', 'To trade', 'To migrate']),
    q('se-d2', 'What does the Quran call it?', 'A clear victory', ['A defeat', 'A war', 'A test only']),
    q('se-d3', 'Who received a letter from the Prophet ﷺ?', 'Heraclius, Khosrow and the Najāshī', ['Only the Quraysh', 'Only the Anṣār', 'Nobody']),
    q('se-d4', 'What happened after the treaty?', 'Islam spread faster', ['The Muslims left Madinah', 'The war grew', 'The Kaaba closed']),
  ]),
  lesson('se-conquest', 'The conquest and the Farewell Hajj', 'Forgiveness, and the last sermon.', [
    slide('The conquest of Makkah', 'In Ramadan of 8 AH the Muslims entered Makkah almost without fighting. The Prophet ﷺ cleansed the Kaaba of its idols and forgave those who had fought him, saying: “Go, for you are free.”'),
    slide('The Farewell Hajj', 'In 10 AH he led the only Hajj of his life with more than a hundred thousand Muslims. At ‘Arafah he gave the Farewell Sermon: the sanctity of life and property, the rights of women, that no Arab is above a non-Arab and no non-Arab above an Arab except in taqwa, and that he left them the Quran and his Sunnah.'),
  ], [
    q('se-c1', 'How did he treat the people of Makkah after the conquest?', 'He forgave them', ['He punished them all', 'He ignored them', 'He banished them']),
    q('se-c2', 'In which year was the Farewell Hajj?', '10 AH', ['2 AH', '6 AH', '20 AH']),
    q('se-c3', 'Where did he give the Farewell Sermon?', '‘Arafah', ['Madinah', 'Ṭā’if', 'Badr']),
    q('se-c4', 'What two things did he leave them to hold to?', 'The Quran and the Sunnah', ['A sword and a flag', 'Gold and land', 'Nothing']),
  ]),
  lesson('se-passing', 'His passing and the first caliph', 'The end of revelation, and what followed.', [
    slide('His passing', 'A few months after the Farewell Hajj he fell ill and passed away in Madinah in Rabī‘ al-Awwal, 11 AH (632 CE), at the age of 63, in the room of ‘Ā’ishah رضي الله عنها. ‘Umar was shocked, and Abū Bakr stood and said: whoever worshipped Muhammad, Muhammad has died; whoever worships Allah, Allah is Ever-Living and never dies.'),
    slide('Abū Bakr', 'The Muslims chose Abū Bakr aṣ-Ṣiddīq as the first caliph. He kept the community together, sent the army of Usāmah as the Prophet ﷺ had ordered, and had the Quran gathered in one place after the battle of Yamāmah.'),
  ], [
    q('se-p1', 'At what age did the Prophet ﷺ pass away?', '63', ['40', '53', '75']),
    q('se-p2', 'Who became the first caliph?', 'Abū Bakr', ['‘Umar', '‘Uthmān', '‘Alī']),
    q('se-p3', 'Where was he when he passed away?', 'In Madinah', ['In Makkah', 'In Ṭā’if', 'At Badr']),
    q('se-p4', 'Which first caliph had the Quran gathered in one place?', 'Abū Bakr', ['Mu‘āwiyah', 'Hārūn', 'Yazīd']),
  ]),
]

// ───────────────────────── Understanding the Quran ─────────────────────────

export const QURAN_101: Lesson[] = [
  lesson('qu-what', 'What is the Quran?', 'The speech of Allah, revealed over about 23 years.', [
    slide('The final revelation', 'The Quran is the speech of Allah, sent down to Prophet Muhammad ﷺ through the angel Jibrīl in Arabic over about 23 years, in Makkah and Madinah. It is for all people, in all times, and Allah promised to protect it (15:9).'),
    slide('In numbers', 'It has 114 surahs (chapters) and 6,236 verses (counting the Basmalah only where it is part of a surah’s first verse, as in al-Fātiḥah). It is divided into 30 equal parts called juz’ so it can be read in a month, and the Madinah Mushaf has 604 pages.'),
  ], [
    q('qu-w1', 'How many surahs are in the Quran?', '114', ['99', '30', '124']),
    q('qu-w2', 'How many juz’ is it divided into?', '30', ['7', '60', '114']),
    q('qu-w3', 'Over about how long was it revealed?', '23 years', ['1 year', '10 years', '100 years']),
    q('qu-w4', 'Which angel brought it?', 'Jibrīl', ['Mīkā’īl', 'Isrāfīl', 'Mālik']),
  ]),
  lesson('qu-structure', 'Makkan and Madani surahs', 'Where and when a surah came down.', [
    slide('Two periods', 'Surahs revealed before the Hijrah are called Makkan; those after it, Madani. Makkan surahs are mostly short and strong: belief in One God, the Hereafter, the prophets and good character. Madani surahs are often longer and speak about community life: prayer, fasting, zakat, family law, trade and justice.'),
    slide('Longest and shortest', 'The longest surah is al-Baqarah (286 verses); the shortest is al-Kawthar (3 verses). The first verses revealed were 96:1–5, “Iqra’”. The Quran is not arranged by date of revelation but in the order the Prophet ﷺ was taught by Jibrīl, starting with al-Fātiḥah.'),
  ], [
    q('qu-s1', 'Surahs revealed before the Hijrah are called…', 'Makkan', ['Madani', 'Basmalah', 'Juz’']),
    q('qu-s2', 'Which is the longest surah?', 'Al-Baqarah', ['Al-Fātiḥah', 'Al-Kawthar', 'Yā Sīn']),
    q('qu-s3', 'Which is the shortest surah?', 'Al-Kawthar', ['Al-Ikhlāṣ', 'Al-Fātiḥah', 'An-Nās']),
    q('qu-s4', 'Are the surahs arranged by date of revelation?', 'No, in the order taught by Jibrīl', ['Yes, exactly', 'By length only', 'Alphabetically']),
  ]),
  lesson('qu-names', 'Names of the Quran', 'Each name tells us something about it.', [
    slide('Names', 'The Quran names itself in many ways:', { bullets: ['القُرْآن (al-Qur’ān): that which is recited, read again and again', 'الفُرْقَان (al-Furqān): the Criterion between truth and falsehood', 'الكِتَاب (al-Kitāb): the Book', 'الذِّكْر (adh-Dhikr): the Reminder', 'الهُدَى (al-Hudā): the Guidance', 'النُّور (an-Nūr): the Light'] }),
  ], [
    q('qu-n1', 'Al-Furqān means…', 'The Criterion', ['The Reminder', 'The Light', 'The Book']),
    q('qu-n2', 'Adh-Dhikr means…', 'The Reminder', ['The Book', 'The Guidance', 'The Criterion']),
    q('qu-n3', 'What does “Qur’ān” literally describe?', 'That which is recited', ['That which is written', 'That which is hidden', 'That which is old']),
    q('qu-n4', 'Which name means “the Guidance”?', 'Al-Hudā', ['Al-Furqān', 'Adh-Dhikr', 'Al-Kitāb']),
  ]),
  lesson('qu-collect', 'How the Quran was preserved', 'Memorised, written, gathered and copied.', [
    slide('In the Prophet’s time', 'Whenever a revelation came, the Prophet ﷺ had it memorised and written down by scribes such as Zayd ibn Thābit. Each Ramadan Jibrīl reviewed the whole Quran with him, and in his last year twice.'),
    slide('After him', 'After the battle of Yamāmah, where many reciters were martyred, Abū Bakr asked Zayd to gather all the written pieces into one set, checked against those who had memorised it. In the time of ‘Uthmān رضي الله عنه, copies in one agreed spelling were sent to the main cities. Muslims have read the same text ever since.'),
  ], [
    q('qu-c1', 'Who gathered the Quran in one set under Abū Bakr?', 'Zayd ibn Thābit', ['Bilāl', 'Khālid', 'Salmān']),
    q('qu-c2', 'Which caliph had standard copies sent to the cities?', '‘Uthmān', ['‘Umar', 'Abū Bakr', '‘Alī']),
    q('qu-c3', 'How was it kept safe in the Prophet’s time?', 'Memorised and written', ['Only written', 'Only memorised in one person', 'It was not recorded']),
    q('qu-c4', 'Who reviewed the Quran with the Prophet ﷺ each Ramadan?', 'Jibrīl', ['Abū Bakr', 'Zayd', 'Bilāl']),
  ]),
  lesson('qu-read', 'How to read and understand it', 'Reciting, reflecting and learning.', [
    slide('Etiquette', 'We read the Quran with respect: clean, with a sincere intention, beginning with “A‘ūdhu billāhi minash-shayṭānir-rajīm”, and slowly with tajweed. Most scholars say to be in wudu to touch the printed mushaf. Listening is also an act of worship.'),
    slide('Understanding', 'Tafsīr is explaining the meaning of the Quran. Use a translation, then a trusted tafsir. Reflect on a few verses each day (tadabbur). The app’s Tafsir page explains any verse; the Listen and Journey pages let you hear and reflect.', { href: '/tafsir' }),
  ], [
    q('qu-r1', 'What is tafsīr?', 'Explaining the meaning of the Quran', ['Memorising the Quran', 'Writing the Quran', 'Reciting fast']),
    q('qu-r2', 'What do we say before reciting?', 'A‘ūdhu billāhi minash-shayṭānir-rajīm', ['Shukran', 'Ma‘as-salāmah', 'Marḥaban']),
    q('qu-r3', 'Tadabbur means…', 'Reflecting on the meaning', ['Reciting loudly', 'Copying it out', 'Memorising numbers']),
    q('qu-r4', 'Is listening to the Quran a good deed?', 'Yes', ['No', 'Only in Ramadan', 'Only for scholars']),
  ]),
]

// ───────────────────────── Catalogue ─────────────────────────

export type Audience = 'kids' | 'everyone'
export type CourseInfo = { audience: Audience; level: 'Beginner' | 'Intermediate'; minutes: number; learn: string[] }

export const ACADEMY_PATHS: (PathMeta & { info: CourseInfo })[] = [
  { id: 'kids-arabic', title: 'My First Arabic Words', icon: '🧒', blurb: 'Greetings, numbers, colours, family, animals and more, for children.', color: '#EA580C', info: { audience: 'kids', level: 'Beginner', minutes: 70, learn: ['Greet people in Arabic', 'Count to ten', 'Name colours, animals and things at home'] } },
  { id: 'kids-islam', title: 'My Islam', icon: '🌙', blurb: 'Allah, the Prophet ﷺ, the five pillars, manners, prayer and Ramadan, in simple words.', color: '#16A34A', info: { audience: 'kids', level: 'Beginner', minutes: 60, learn: ['Who Allah is', 'The five pillars', 'How to make wudu', 'Good manners'] } },
  { id: 'arabic-1', title: 'Arabic for Beginners', icon: '🔤', blurb: 'Pronouns, sentences, “the”, gender, plurals, roots and verbs, step by step.', color: '#0F766E', info: { audience: 'everyone', level: 'Beginner', minutes: 150, learn: ['Make simple Arabic sentences', 'Use al-, this/that, prepositions and questions', 'Understand roots and basic verbs'] } },
  { id: 'seerah', title: 'The Life of the Prophet ﷺ', icon: '🕋', blurb: 'From birth to the Farewell Hajj, in ten lessons.', color: '#B45309', info: { audience: 'everyone', level: 'Beginner', minutes: 120, learn: ['The main events in order', 'The lessons of patience and forgiveness', 'The Hijrah and the Madinah community'] } },
  { id: 'quran-101', title: 'Understanding the Quran', icon: '📖', blurb: 'What it is, how it was revealed and preserved, and how to read it well.', color: '#7C3AED', info: { audience: 'everyone', level: 'Beginner', minutes: 60, learn: ['The structure of the Quran', 'Makkan and Madani surahs', 'How the Quran was preserved'] } },
]

export const ACADEMY_LESSONS: Record<string, Lesson[]> = { 'kids-arabic': KIDS_ARABIC, 'kids-islam': KIDS_ISLAM, 'arabic-1': ARABIC_1, seerah: SEERAH, 'quran-101': QURAN_101 }

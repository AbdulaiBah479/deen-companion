// Great Muslims of history: rulers, leaders, women of influence, scientists, scholars, explorers and builders.
// Short, careful summaries — dates are given as widely cited, with "c." where historians differ. Every entry links to its
// Wikipedia article (via the Library) for the full story. `clues` finish the sentence "Who …?" and never name the person.

export type HeritageCategory = 'rulers' | 'leaders' | 'women' | 'scientists' | 'scholars' | 'explorers'

export const HERITAGE_CATEGORIES: { id: HeritageCategory; title: string; icon: string; blurb: string }[] = [
  { id: 'rulers', title: 'Kings & caliphs', icon: '👑', blurb: 'Rulers who built empires and cities of learning' },
  { id: 'leaders', title: 'Leaders & defenders', icon: '🛡️', blurb: 'Commanders and reformers who stood for their people' },
  { id: 'women', title: 'Women who shaped history', icon: '🌸', blurb: 'Scholars, founders, rulers and saints' },
  { id: 'scientists', title: 'Scientists & inventors', icon: '🔬', blurb: 'Medicine, maths, optics, astronomy and engineering' },
  { id: 'scholars', title: 'Scholars & thinkers', icon: '📚', blurb: 'Imams, hadith masters and philosophers' },
  { id: 'explorers', title: 'Explorers & builders', icon: '🧭', blurb: 'Travellers, mapmakers and architects' },
]

export type Heritage = {
  id: string
  name: string
  cat: HeritageCategory
  icon: string
  years: string // as displayed
  start: number // approximate birth year (CE), for ordering a timeline
  region: string
  wiki: string // Wikipedia title (see Library)
  story: string
  facts: string[]
  lesson: string
  clues: string[]
}

export const HERITAGE: Heritage[] = [
  // ───────── Kings & caliphs ─────────
  {
    id: 'umar-abd-al-aziz', name: 'Umar ibn Abd al-Aziz', cat: 'rulers', icon: '⚖️', years: 'c. 682–720', start: 682, region: 'Syria & the Umayyad lands', wiki: 'Umar ibn Abd al-Aziz',
    story: 'Umar became caliph in 717 and ruled for only about two and a half years, yet he is remembered as one of the most just rulers in Muslim history. He gave up the luxury of the court, lived simply, and tried to make taxes and governance fairer for ordinary people. Many later scholars called him the “fifth rightly-guided caliph”.',
    facts: ['He reigned from 717 to 720 as an Umayyad caliph.', 'He is famous for personal humility and for fairness in governing.', 'Later generations remembered his short reign as a model of justice.'],
    lesson: 'Power is a trust (amanah): its measure is how fairly it treats the weakest.',
    clues: ['ruled as an Umayyad caliph for only about two and a half years (717–720)', 'gave up the luxury of the court and is remembered for justice and simplicity', 'is sometimes called the “fifth rightly-guided caliph”'],
  },
  {
    id: 'harun-al-rashid', name: 'Harun al-Rashid', cat: 'rulers', icon: '🕌', years: 'c. 763–809', start: 763, region: 'Baghdad, Iraq', wiki: 'Harun al-Rashid',
    story: 'Harun ruled the Abbasid Caliphate from 786 to 809, when Baghdad — the “Round City” founded by his grandfather al-Mansur — was among the largest and richest cities in the world. Scholars, poets, doctors and translators gathered there, and the caliph supported learning, laying ground for the great age of science that followed under his son al-Ma’mun.',
    facts: ['He was the fifth Abbasid caliph and ruled 786–809.', 'Baghdad, his capital, was founded in 762 by al-Mansur.', 'He is the caliph of many tales in “One Thousand and One Nights”, though those stories are legend.'],
    lesson: 'A society that honours knowledge and its teachers grows strong.',
    clues: ['ruled the Abbasid Caliphate from Baghdad between 786 and 809', 'was the caliph in whose time Baghdad became a gathering place for scholars, poets and translators', 'appears as a character in the tales of “One Thousand and One Nights”'],
  },
  {
    id: 'al-mamun', name: 'Al-Ma’mun', cat: 'rulers', icon: '🏛️', years: '786–833', start: 786, region: 'Baghdad, Iraq', wiki: "Al-Ma'mun",
    story: 'Al-Ma’mun was the Abbasid caliph from 813 to 833 and a great patron of learning. Under him the House of Wisdom in Baghdad flourished as a centre where scholars translated and studied works from Greek, Persian, Indian and Syriac, and wrote new ones. Mathematicians such as al-Khwarizmi worked in this environment.',
    facts: ['He was caliph from 813 to 833.', 'He supported the translation movement and the House of Wisdom in Baghdad.', 'Astronomers working for him measured the size of the Earth.'],
    lesson: 'Curiosity shared across cultures multiplies knowledge for everyone.',
    clues: ['was the Abbasid caliph (813–833) who made the House of Wisdom in Baghdad a great centre of translation and study', 'supported scholars like al-Khwarizmi in Baghdad', 'sponsored astronomers who measured the size of the Earth'],
  },
  {
    id: 'abd-al-rahman-iii', name: 'Abd al-Rahman III', cat: 'rulers', icon: '🌇', years: '891–961', start: 891, region: 'Córdoba, Al-Andalus', wiki: 'Abd al-Rahman III',
    story: 'Abd al-Rahman III came to power in 912 and united a divided Al-Andalus. In 929 he declared himself caliph, making Córdoba the capital of a caliphate. Under him Córdoba grew into one of the largest and most cultured cities in Europe, with libraries, schools and the palace-city of Madinat al-Zahra. Muslims, Christians and Jews all lived and worked there.',
    facts: ['He ruled from 912 to 961 and declared the Caliphate of Córdoba in 929.', 'He built the palace-city of Madinat al-Zahra near Córdoba.', 'His capital was a centre of learning and culture.'],
    lesson: 'Stability and openness help a civilisation flourish.',
    clues: ['declared the Caliphate of Córdoba in 929', 'built the palace-city of Madinat al-Zahra', 'ruled Al-Andalus for almost half a century (912–961)'],
  },
  {
    id: 'salahuddin', name: 'Salahuddin al-Ayyubi (Saladin)', cat: 'rulers', icon: '🗡️', years: '1137/8–1193', start: 1137, region: 'Egypt, Syria & Jerusalem', wiki: 'Saladin',
    story: 'Born in Tikrit to a Kurdish family, Salahuddin rose to rule Egypt and Syria and founded the Ayyubid dynasty. In 1187 he defeated the Crusader army at the Battle of Hattin and then recaptured Jerusalem, which had been under Crusader rule for 88 years. His army spared the city’s people in return for ransom, and he became known across religions for mercy and honour.',
    facts: ['He won the Battle of Hattin in 1187.', 'Jerusalem returned to Muslim rule in 1187 after 88 years.', 'He founded the Ayyubid dynasty and was born in Tikrit to a Kurdish family.'],
    lesson: 'Victory is most honourable when it is joined to mercy.',
    clues: ['recaptured Jerusalem in 1187 after winning the Battle of Hattin', 'founded the Ayyubid dynasty and was born in Tikrit into a Kurdish family', 'became famous, even among his enemies, for mercy and chivalry'],
  },
  {
    id: 'baybars', name: 'Sultan Baybars', cat: 'rulers', icon: '🦁', years: '1223–1277', start: 1223, region: 'Egypt & Syria', wiki: 'Baybars',
    story: 'Baybars began life as a Turkic slave-soldier and rose to become a Mamluk sultan of Egypt and Syria (1260–1277). As a commander he fought at the Battle of Ain Jalut in 1260, where the Mamluks stopped the Mongol advance. As sultan he strengthened the army, built roads, bridges and a postal system, and pushed back the Crusader states.',
    facts: ['He ruled as sultan from 1260 to 1277.', 'He fought in the Mamluk victory over the Mongols at Ain Jalut (1260).', 'He improved communications with a relay postal service.'],
    lesson: 'Talent and discipline can lift a person from the lowest start to the highest responsibility.',
    clues: ['rose from slave-soldier to Mamluk sultan of Egypt and Syria', 'fought at the Battle of Ain Jalut in 1260, where the Mongol advance was stopped', 'ruled from 1260 to 1277 and built up a relay postal system'],
  },
  {
    id: 'mehmed-fatih', name: 'Sultan Mehmed al-Fatih', cat: 'rulers', icon: '🏰', years: '1432–1481', start: 1432, region: 'Constantinople (Istanbul)', wiki: 'Mehmed the Conqueror',
    story: 'Mehmed became Ottoman sultan as a teenager and, aged 21, conquered Constantinople on 29 May 1453 after a siege of about seven weeks, ending the Byzantine Empire. Many Muslims had long hoped to see this, citing a hadith about the conquest of the city. He made it his capital, Istanbul, and invited people of all faiths to settle and rebuild it.',
    facts: ['Constantinople fell on 29 May 1453 when he was 21.', 'His army used large cannons against the city’s walls.', 'He rebuilt the city as the Ottoman capital, later called Istanbul.'],
    lesson: 'Great goals are reached through preparation, patience and trust in Allah.',
    clues: ['conquered Constantinople on 29 May 1453 at the age of 21', 'ended the Byzantine Empire and made the city his capital', 'is known by the title “the Conqueror”'],
  },
  {
    id: 'suleiman', name: 'Suleiman the Magnificent', cat: 'rulers', icon: '📜', years: '1494–1566', start: 1494, region: 'The Ottoman Empire', wiki: 'Suleiman the Magnificent',
    story: 'Suleiman ruled the Ottoman Empire from 1520 to 1566, when it reached the height of its power from Hungary to Iraq and North Africa. Turks call him “Kanuni”, the Lawgiver, because he organised the empire’s laws, courts and taxes. He supported art, poetry and architecture — including the works of the great architect Mimar Sinan.',
    facts: ['He reigned from 1520 to 1566, the longest reign of any Ottoman sultan.', 'In Turkish he is “Kanuni”, the Lawgiver.', 'Mimar Sinan built the Süleymaniye Mosque for him in Istanbul.'],
    lesson: 'Justice and law make power last.',
    clues: ['ruled the Ottoman Empire from 1520 to 1566, at the peak of its power', 'is known in Turkish as “Kanuni”, the Lawgiver', 'had the Süleymaniye Mosque in Istanbul built by Mimar Sinan'],
  },
  {
    id: 'mansa-musa', name: 'Mansa Musa', cat: 'rulers', icon: '🌍', years: 'c. 1280–c. 1337', start: 1280, region: 'The Mali Empire, West Africa', wiki: 'Mansa Musa',
    story: 'Mansa Musa ruled the Mali Empire in West Africa in the early 1300s. In 1324 he made the pilgrimage to Makkah with a huge caravan, and gave away so much gold along the way — especially in Cairo — that its value fell for years. He returned with scholars and architects, and Timbuktu grew into a famous centre of Islamic learning, with mosques and libraries.',
    facts: ['He went on Hajj in 1324.', 'Mali was rich in gold and salt trade.', 'Timbuktu became a major centre of Islamic scholarship during and after his reign.'],
    lesson: 'Wealth is best used for worship, generosity and spreading knowledge.',
    clues: ['made a famous Hajj in 1324 and gave away so much gold that its value dropped in Cairo', 'ruled the Mali Empire in West Africa', 'helped make Timbuktu a centre of Islamic learning'],
  },
  {
    id: 'alp-arslan', name: 'Alp Arslan', cat: 'rulers', icon: '🏹', years: 'c. 1029–1072', start: 1029, region: 'The Seljuk Empire', wiki: 'Alp Arslan',
    story: 'Alp Arslan was the second Seljuk sultan (1063–1072). In 1071 his smaller army defeated the Byzantine emperor at the Battle of Manzikert in eastern Anatolia. The victory opened Anatolia to Turkish settlement, which later led to the Seljuk Sultanate of Rum and, eventually, the Ottoman state. His vizier Nizam al-Mulk built the Nizamiyya schools.',
    facts: ['He was Seljuk sultan from 1063 to 1072.', 'He won the Battle of Manzikert in 1071.', 'His vizier Nizam al-Mulk founded the Nizamiyya madrasas.'],
    lesson: 'Good counsel and a wise minister can be worth an army.',
    clues: ['won the Battle of Manzikert against the Byzantines in 1071', 'was the second Seljuk sultan', 'had a famous vizier, Nizam al-Mulk, who founded the Nizamiyya schools'],
  },

  // ───────── Leaders & defenders ─────────
  {
    id: 'umar-ibn-khattab', name: 'Umar ibn al-Khattab', cat: 'leaders', icon: '🌙', years: 'c. 584–644', start: 584, region: 'Makkah, Madinah & the Caliphate', wiki: 'Umar',
    story: 'Umar, a companion of the Prophet ﷺ, became the second caliph in 634 and ruled for ten years. Under him the lands of the Caliphate grew quickly, and he built its first administration: a public treasury, a pension register, courts and a calendar starting from the Hijra. When Jerusalem surrendered around 637, he went himself and gave its people a written assurance for their safety and places of worship.',
    facts: ['He was caliph from 634 to 644.', 'The Islamic (Hijri) calendar was set during his caliphate.', 'He gave the people of Jerusalem a covenant of safety (the “Umariyya Assurance”).'],
    lesson: 'A leader answers to Allah for every person under his care.',
    clues: ['was the second caliph, ruling from 634 to 644', 'gave the people of Jerusalem a written assurance of safety around 637', 'started the Hijri calendar during his caliphate'],
  },
  {
    id: 'khalid-ibn-walid', name: 'Khalid ibn al-Walid', cat: 'leaders', icon: '⚔️', years: 'c. 592–642', start: 592, region: 'Arabia, Iraq & Syria', wiki: 'Khalid ibn al-Walid',
    story: 'Khalid was a gifted commander who accepted Islam before the conquest of Makkah. The Prophet ﷺ gave him the title “Sword of Allah” (Sayfullah). He led Muslim armies in the wars of the early caliphate and in the decisive Battle of Yarmouk in 636, which opened Syria. Tradition says he was proud that he never lost a battle.',
    facts: ['The Prophet ﷺ called him “Sayfullah”, the Sword of Allah.', 'He commanded at the Battle of Yarmouk (636).', 'He is traditionally described as undefeated in battle.'],
    lesson: 'Skill and courage, once turned toward the truth, serve the whole community.',
    clues: ['was given the title “Sayfullah” (Sword of Allah) by the Prophet ﷺ', 'led Muslim forces at the Battle of Yarmouk in 636', 'is traditionally remembered as never having lost a battle'],
  },
  {
    id: 'tariq-ibn-ziyad', name: 'Tariq ibn Ziyad', cat: 'leaders', icon: '⛵', years: 'died c. 720', start: 670, region: 'North Africa & Iberia', wiki: 'Tariq ibn Ziyad',
    story: 'Tariq was a Muslim commander, commonly described as being of Amazigh (Berber) background, who led an army across the strait from North Africa into the Iberian Peninsula in 711. The great rock where he landed became known as Jabal Tariq — “Tariq’s mountain” — which gave Gibraltar its name. His campaign began the history of Al-Andalus.',
    facts: ['He crossed into Iberia in 711.', 'Gibraltar comes from “Jabal Tariq”.', 'He served under the governor Musa ibn Nusayr.'],
    lesson: 'Bold steps need clear purpose and a team behind them.',
    clues: ['led the crossing from North Africa into Iberia in 711', 'gave his name to the Rock of Gibraltar', 'is commonly described as an Amazigh (Berber) commander and began the story of Al-Andalus'],
  },
  {
    id: 'abd-al-qadir', name: 'Emir Abd al-Qadir', cat: 'leaders', icon: '🕊️', years: '1808–1883', start: 1808, region: 'Algeria & Damascus', wiki: 'Abdelkader El Djezairi',
    story: 'Abd al-Qadir was an Algerian scholar, Sufi and leader who united tribes and resisted the French conquest of Algeria for fifteen years starting in 1832. After he surrendered in 1847 he was held in France, then lived in Damascus. In 1860, when violence broke out in the city, he sheltered thousands of Christians in his home and nearby, earning respect from around the world.',
    facts: ['He led the resistance in Algeria from 1832 to 1847.', 'He was both a religious scholar and a military and political leader.', 'In Damascus in 1860 he protected thousands of Christians.'],
    lesson: 'True strength protects the innocent, whatever their faith.',
    clues: ['led the Algerian resistance to French conquest from 1832 to 1847', 'saved thousands of Christians in Damascus in 1860', 'was both a Sufi scholar and a political and military leader'],
  },
  {
    id: 'omar-mukhtar', name: 'Omar al-Mukhtar', cat: 'leaders', icon: '🦅', years: '1858–1931', start: 1858, region: 'Libya', wiki: 'Omar Mukhtar',
    story: 'Omar al-Mukhtar was a teacher of the Quran who became the leader of Libyan resistance to Italian colonial rule. For more than twenty years he led small, mobile groups of fighters in Cyrenaica, despite being far outnumbered. He was captured in 1931 and executed at about the age of 73, and is remembered as a national hero of Libya.',
    facts: ['He was a Quran teacher before leading the resistance.', 'He was captured and executed in September 1931.', 'He is known as the “Lion of the Desert”.'],
    lesson: 'Faith and steadfastness give strength beyond numbers.',
    clues: ['is known as the “Lion of the Desert”', 'was a teacher of the Quran who led Libyan resistance to Italian rule for over twenty years', 'was captured and executed in 1931 at about age 73'],
  },
  {
    id: 'usman-dan-fodio', name: 'Usman dan Fodio', cat: 'leaders', icon: '📖', years: '1754–1817', start: 1754, region: 'West Africa (Sokoto)', wiki: 'Usman dan Fodio',
    story: 'Usman dan Fodio was a Fulani scholar and teacher in what is now northern Nigeria. He preached reform, justice and learning, and criticised unfair taxes and corrupt rulers. After a jihad beginning in 1804 he founded the Sokoto Caliphate, one of the largest states in West Africa. He and his family — including his daughter Nana Asma’u — wrote a great deal and promoted education, including for women.',
    facts: ['He founded the Sokoto Caliphate in the early 1800s.', 'He was a scholar and author before he was a ruler.', 'His daughter Nana Asma’u was a noted poet and teacher.'],
    lesson: 'Reform begins with teaching and ends with justice.',
    clues: ['founded the Sokoto Caliphate in West Africa after 1804', 'was a Fulani scholar whose reform movement stressed learning and justice', 'was the father of the poet and teacher Nana Asma’u'],
  },

  // ───────── Women who shaped history ─────────
  {
    id: 'khadija', name: 'Khadija bint Khuwaylid', cat: 'women', icon: '🌷', years: 'c. 555–619', start: 555, region: 'Makkah', wiki: 'Khadija bint Khuwaylid',
    story: 'Khadija was a respected and successful merchant in Makkah, known for her honesty. She married Muhammad ﷺ before prophethood, and when the first revelation came she comforted him and was the first person to believe. Throughout the hard early years she supported the message with her wealth and loyalty. She passed away in 619, in what is called the Year of Sorrow.',
    facts: ['She ran a trading business in Makkah.', 'She was the first person to accept Islam.', 'Her death in 619 came the same year as the death of Abu Talib.'],
    lesson: 'Honest work and steadfast support can change the world.',
    clues: ['was a successful merchant of Makkah and the first person to accept Islam', 'comforted the Prophet ﷺ after the first revelation in the cave of Hira', 'died in 619, in the “Year of Sorrow”'],
  },
  {
    id: 'aisha', name: 'Aisha bint Abi Bakr', cat: 'women', icon: '📚', years: 'c. 613–678', start: 613, region: 'Madinah', wiki: 'Aisha',
    story: 'Aisha, wife of the Prophet ﷺ and daughter of Abu Bakr, became one of the foremost scholars of her time. She is counted among the companions who narrated the most hadith — more than two thousand — and senior companions came to her for rulings. She taught men and women in Madinah for decades after the Prophet’s ﷺ death, and became an example of women’s learning.',
    facts: ['She narrated over two thousand hadith.', 'Companions consulted her on questions of fiqh and the Prophet’s ﷺ practice.', 'She taught students from her home in Madinah for about 45 years.'],
    lesson: 'Seeking and sharing knowledge is a lifelong calling.',
    clues: ['narrated over two thousand hadith and taught both men and women in Madinah', 'was the daughter of Abu Bakr and a wife of the Prophet ﷺ', 'was consulted by senior companions on matters of fiqh'],
  },
  {
    id: 'fatima-al-fihri', name: 'Fatima al-Fihri', cat: 'women', icon: '🏫', years: 'died c. 880', start: 800, region: 'Fez, Morocco', wiki: 'Fatima al-Fihri',
    story: 'Fatima al-Fihri and her sister Mariam were daughters of a wealthy merchant who had moved from Kairouan to Fez. After inheriting his wealth, Fatima used it in 859 to found the mosque and madrasa of al-Qarawiyyin. It grew into a leading centre of learning and is recognised as one of the oldest continuously operating universities in the world.',
    facts: ['She founded al-Qarawiyyin in Fez in 859.', 'It is often described as the oldest continuously operating university.', 'She used her inheritance for the public good.'],
    lesson: 'A single act of generosity can feed generations of learning.',
    clues: ['founded the al-Qarawiyyin mosque and madrasa in Fez in 859', 'used her inheritance to create what is often called the oldest continuously operating university', 'was a daughter of a merchant from Kairouan who settled in Fez'],
  },
  {
    id: 'razia-sultana', name: 'Razia Sultana', cat: 'women', icon: '👑', years: 'c. 1205–1240', start: 1205, region: 'Delhi, India', wiki: 'Razia Sultana',
    story: 'Razia was the daughter of Sultan Iltutmish and was chosen by him to succeed him. She ruled the Delhi Sultanate from 1236 to 1240 and is the only woman to have done so. Chroniclers say she held court in public, led armies, and promoted the able regardless of rank. Powerful nobles resented her, and she was overthrown and killed in 1240.',
    facts: ['She reigned from 1236 to 1240.', 'She was the only woman to rule the Delhi Sultanate.', 'Her father, Iltutmish, named her as his heir.'],
    lesson: 'Ability matters; those who rise on merit often face the fiercest resistance.',
    clues: ['was the only woman ever to rule the Delhi Sultanate (1236–1240)', 'was named heir by her father, Sultan Iltutmish', 'was overthrown by resentful nobles in 1240'],
  },
  {
    id: 'shajar-al-durr', name: 'Shajar al-Durr', cat: 'women', icon: '🏺', years: 'died 1257', start: 1210, region: 'Egypt', wiki: 'Shajar al-Durr',
    story: 'Shajar al-Durr was the wife of the Ayyubid sultan al-Salih Ayyub. When he died in 1249, during the Seventh Crusade, she kept his death secret while the army prepared, and Egypt’s forces defeated the Crusaders in 1250. She was then recognised as sultana, and her short rule marks the end of Ayyubid rule and the start of the Mamluk era in Egypt.',
    facts: ['She became sultana of Egypt in 1250.', 'She helped manage the crisis of the Seventh Crusade.', 'Her reign marks the transition from the Ayyubids to the Mamluks.'],
    lesson: 'Calm leadership in a crisis can save a nation.',
    clues: ['became sultana of Egypt in 1250 and began the Mamluk era', 'kept the death of her husband, the sultan, secret during the Seventh Crusade', 'was the widow of al-Salih Ayyub'],
  },
  {
    id: 'rabia-al-adawiyya', name: 'Rabia al-Adawiyya', cat: 'women', icon: '🕯️', years: 'c. 717–801', start: 717, region: 'Basra, Iraq', wiki: 'Rabia Basri',
    story: 'Rabia lived in Basra and is among the best-known early Muslim saints. She is said to have been born poor, to have been freed from servitude, and to have given her life to worship. She is remembered for teaching that Allah should be loved for His own sake, not out of fear of punishment or hope for reward, and for her poetry and prayers.',
    facts: ['She lived in Basra in the 8th century.', 'She is one of the most famous early women of Sufism.', 'Her teaching emphasised pure love for Allah.'],
    lesson: 'Worship purified of everything but love for Allah is the highest worship.',
    clues: ['lived in Basra and taught that Allah should be loved for His own sake alone', 'is remembered as one of the most famous early women of Sufism', 'was born poor, was freed, and devoted her life to worship'],
  },

  // ───────── Scientists & inventors ─────────
  {
    id: 'al-khwarizmi', name: 'Al-Khwarizmi', cat: 'scientists', icon: '➗', years: 'c. 780–c. 850', start: 780, region: 'Baghdad (from Khwarazm)', wiki: 'Al-Khwarizmi',
    story: 'Muhammad ibn Musa al-Khwarizmi worked in Baghdad’s House of Wisdom. His book “Al-Kitab al-Mukhtasar fi Hisab al-Jabr wa’l-Muqabala” gave us the word algebra (from al-jabr), and his name gave us the word algorithm. He also helped spread the Hindu–Arabic numerals and wrote on geography and astronomy.',
    facts: ['“Algebra” comes from al-jabr in the title of his book.', '“Algorithm” comes from the Latin form of his name.', 'He helped spread the decimal number system, including zero.'],
    lesson: 'A clear method can solve problems for all of humanity.',
    clues: ['wrote the book that gave the world the word “algebra”', 'gave his name to the word “algorithm”', 'worked at the House of Wisdom in Baghdad and helped spread Hindu–Arabic numerals'],
  },
  {
    id: 'ibn-al-haytham', name: 'Ibn al-Haytham (Alhazen)', cat: 'scientists', icon: '🔭', years: 'c. 965–c. 1040', start: 965, region: 'Basra & Cairo', wiki: 'Ibn al-Haytham',
    story: 'Ibn al-Haytham worked in Cairo. In his “Book of Optics” (written 1011–1021) he showed through experiments that we see because light enters the eye from objects, not because the eye sends out rays. He studied the camera obscura, lenses and the way light bends. His emphasis on testing ideas by experiment makes him an important figure in the history of the scientific method.',
    facts: ['His “Book of Optics” was written between 1011 and 1021.', 'He argued vision happens when light enters the eye.', 'He stressed testing hypotheses with experiments.'],
    lesson: 'Test what you believe about the world and let evidence correct you.',
    clues: ['wrote the “Book of Optics”, showing that we see because light enters the eye', 'studied the camera obscura and stressed experiments in science', 'worked in Cairo and is often called the “father of modern optics”'],
  },
  {
    id: 'ibn-sina', name: 'Ibn Sina (Avicenna)', cat: 'scientists', icon: '⚕️', years: '980–1037', start: 980, region: 'Bukhara & Persia', wiki: 'Avicenna',
    story: 'Ibn Sina, born near Bukhara, was a physician and philosopher who is said to have mastered the Quran and many sciences while still a teenager. His encyclopedia “The Canon of Medicine” gathered the medical knowledge of his time and was used as a textbook in Muslim lands and in Europe for hundreds of years. He also wrote “The Book of Healing”, on philosophy and science.',
    facts: ['His “Canon of Medicine” became a standard textbook for centuries.', 'He was born near Bukhara and died in 1037.', 'He also wrote “The Book of Healing” on philosophy and science.'],
    lesson: 'Learning is a path to serving others through healing.',
    clues: ['wrote “The Canon of Medicine”, a textbook used for centuries in Muslim lands and Europe', 'was born near Bukhara and, it is said, mastered the Quran and many sciences as a teenager', 'wrote “The Book of Healing” on philosophy and science'],
  },
  {
    id: 'al-zahrawi', name: 'Al-Zahrawi (Abulcasis)', cat: 'scientists', icon: '🩺', years: 'c. 936–1013', start: 936, region: 'Córdoba, Al-Andalus', wiki: 'Al-Zahrawi',
    story: 'Abu al-Qasim al-Zahrawi was a physician at the court of the Caliphate of Córdoba. His 30-volume medical encyclopedia “Al-Tasrif” included a famous section on surgery with drawings of more than 200 instruments, many of which he designed. Translated into Latin, it taught European surgeons for centuries.',
    facts: ['His encyclopedia “Al-Tasrif” has 30 volumes.', 'The surgery section illustrated surgical instruments.', 'It was translated into Latin and used in Europe for centuries.'],
    lesson: 'Careful craft and precision save lives.',
    clues: ['wrote “Al-Tasrif”, a 30-volume medical encyclopedia with a famous section on surgery', 'served as a physician in Córdoba and designed many surgical instruments', 'is called the “father of surgery” in Islamic medicine'],
  },
  {
    id: 'al-jazari', name: 'Al-Jazari', cat: 'scientists', icon: '⚙️', years: '1136–1206', start: 1136, region: 'Upper Mesopotamia (Diyarbakır)', wiki: 'Ismail al-Jazari',
    story: 'Ismail al-Jazari was an engineer who served the Artuqid rulers in what is now south-eastern Turkey. In 1206 he finished “The Book of Knowledge of Ingenious Mechanical Devices”, describing about 50 machines with instructions for building them — water clocks including the famous elephant clock, automatic fountains, and pumps using cranks and cams. Many of his ideas appear in later machines.',
    facts: ['His book was completed in 1206.', 'It describes about fifty devices, including the elephant clock.', 'He used mechanisms such as the crank, the camshaft and gears.'],
    lesson: 'Creativity and patience can turn a good idea into a working machine.',
    clues: ['wrote the “Book of Knowledge of Ingenious Mechanical Devices”, finished in 1206', 'designed the famous elephant water clock', 'was an engineer who used cranks, cams and gears in machines'],
  },
  {
    id: 'al-biruni', name: 'Al-Biruni', cat: 'scientists', icon: '🌍', years: '973–1048', start: 973, region: 'Khwarazm, Central Asia', wiki: 'Al-Biruni',
    story: 'Al-Biruni was a scholar of astronomy, mathematics, geography and history. He estimated the radius of the Earth with a clever method that used the height of a mountain and the angle of the horizon, getting a result very close to the modern value. He also spent years in India and wrote a detailed, respectful study of its people, languages and sciences.',
    facts: ['He calculated the Earth’s radius using a mountain and the horizon angle.', 'He wrote a major book on India (Kitab al-Hind).', 'He studied many subjects in several languages.'],
    lesson: 'Understanding other peoples starts with listening to them in their own words.',
    clues: ['calculated the radius of the Earth using a mountain and the angle of the horizon', 'wrote a detailed study of India after years of living there', 'was a scholar of astronomy, maths, geography and history from Khwarazm'],
  },
  {
    id: 'al-razi', name: 'Al-Razi (Rhazes)', cat: 'scientists', icon: '💊', years: 'c. 865–925', start: 865, region: 'Rayy & Baghdad', wiki: 'Rhazes',
    story: 'Abu Bakr al-Razi was a physician and chemist who headed hospitals in Rayy and Baghdad. He wrote a well-known treatise distinguishing smallpox from measles, and a huge medical encyclopedia, “Al-Hawi”. He believed in careful observation of patients and in keeping detailed records of cases.',
    facts: ['He wrote a famous treatise on smallpox and measles.', 'His encyclopedia “Al-Hawi” gathered medical knowledge and his own case notes.', 'He directed hospitals in Rayy and Baghdad.'],
    lesson: 'Observe closely and record honestly — that is how medicine progresses.',
    clues: ['wrote an early treatise distinguishing smallpox from measles', 'compiled the medical encyclopedia “Al-Hawi” and directed hospitals in Rayy and Baghdad', 'insisted on careful observation and record-keeping of patients'],
  },
  {
    id: 'ibn-al-nafis', name: 'Ibn al-Nafis', cat: 'scientists', icon: '❤️', years: '1213–1288', start: 1213, region: 'Damascus & Cairo', wiki: 'Ibn al-Nafis',
    story: 'Ibn al-Nafis, a physician trained in Damascus and later working in Cairo, wrote a commentary on Ibn Sina’s “Canon”. In it he described that blood passes from the right to the left side of the heart through the lungs — the pulmonary circulation — and challenged the older view that it moved through invisible pores in the heart wall. He also wrote a medical encyclopedia, and a novel-like story about reason and revelation.',
    facts: ['He described the pulmonary circulation in the 13th century.', 'He worked in Damascus and in Cairo.', 'He challenged older ideas about the heart.'],
    lesson: 'Respect your teachers, and still follow the evidence where it leads.',
    clues: ['described how blood passes through the lungs from the right to the left side of the heart', 'wrote a commentary on the “Canon” of Ibn Sina and worked in Damascus and Cairo', 'lived in the 13th century and corrected older ideas about the heart'],
  },
  {
    id: 'omar-khayyam', name: 'Omar Khayyam', cat: 'scientists', icon: '🌹', years: '1048–1131', start: 1048, region: 'Nishapur, Persia', wiki: 'Omar Khayyam',
    story: 'Omar Khayyam was a mathematician and astronomer in the Seljuk era. He wrote a treatise showing how to solve cubic equations using intersecting conic sections, and he helped create an accurate solar calendar. He is also famous as the poet associated with the “Rubaiyat”, quatrains that became very popular in the English-speaking world through a 19th-century translation.',
    facts: ['He solved cubic equations geometrically.', 'He took part in reforming the calendar in the 11th century.', 'The “Rubaiyat” made him famous as a poet.'],
    lesson: 'Mathematics and poetry both grow from wonder at creation.',
    clues: ['worked out geometric solutions to cubic equations and helped reform the calendar', 'is the poet associated with the “Rubaiyat”', 'lived in Nishapur in the Seljuk era'],
  },
  {
    id: 'ulugh-beg', name: 'Ulugh Beg', cat: 'scientists', icon: '⭐', years: '1394–1449', start: 1394, region: 'Samarkand', wiki: 'Ulugh Beg',
    story: 'Ulugh Beg was a Timurid ruler of Samarkand who loved science even more than politics. He built a great observatory in the 1420s and, with his team, produced the “Zij-i Sultani”, a star catalogue with the positions of about a thousand stars that was among the most accurate before the telescope. He also founded madrasas in Samarkand and Bukhara.',
    facts: ['He built an observatory in Samarkand in the 1420s.', 'His star catalogue listed about 1,000 stars.', 'He founded madrasas in several cities.'],
    lesson: 'Looking up at the heavens teaches humility and precision.',
    clues: ['built a great observatory at Samarkand and produced an accurate star catalogue', 'was a Timurid ruler and astronomer', 'founded madrasas in Samarkand and Bukhara'],
  },
  {
    id: 'al-kindi', name: 'Al-Kindi', cat: 'scientists', icon: '🔐', years: 'c. 801–873', start: 801, region: 'Baghdad', wiki: 'Al-Kindi',
    story: 'Ya‘qub ibn Ishaq al-Kindi, called “the philosopher of the Arabs”, worked in Baghdad at the time of al-Ma’mun and his successors. He wrote on philosophy, medicine, optics, music and mathematics. In a famous treatise on deciphering messages he described frequency analysis, a basic method for breaking codes that is still taught in cryptography.',
    facts: ['He wrote hundreds of works on many subjects.', 'He described frequency analysis for code-breaking.', 'He worked in Baghdad in the 9th century.'],
    lesson: 'Study widely — ideas from one field often solve problems in another.',
    clues: ['described frequency analysis, a basic method of breaking codes', 'is known as “the philosopher of the Arabs”', 'wrote on philosophy, music, optics and medicine in 9th-century Baghdad'],
  },
  {
    id: 'nasir-al-din-tusi', name: 'Nasir al-Din al-Tusi', cat: 'scientists', icon: '🪐', years: '1201–1274', start: 1201, region: 'Maragheh, Persia', wiki: 'Nasir al-Din al-Tusi',
    story: 'Nasir al-Din al-Tusi was a polymath who survived the Mongol conquests and persuaded the Mongol ruler Hulagu to support science. At Maragheh, in the 1250s–60s, he led the building of a famous observatory and library. He developed a geometric device now called the Tusi couple, which models astronomical motion, and wrote on mathematics, ethics and logic.',
    facts: ['The Maragheh observatory was founded in the 1250s.', 'The Tusi couple is named after him.', 'He also wrote an influential work on ethics.'],
    lesson: 'Knowledge can be rebuilt even after the greatest catastrophe.',
    clues: ['led the construction of the Maragheh observatory under the Mongol ruler Hulagu', 'is credited with a geometric device called the Tusi couple', 'was a polymath who wrote on astronomy, ethics and logic'],
  },

  // ───────── Scholars & thinkers ─────────
  {
    id: 'ibn-khaldun', name: 'Ibn Khaldun', cat: 'scholars', icon: '🏛️', years: '1332–1406', start: 1332, region: 'Tunis, Fez, Cairo', wiki: 'Ibn Khaldun',
    story: 'Ibn Khaldun, born in Tunis, served as a judge and adviser in North Africa, Al-Andalus and Egypt. In 1377 he finished the “Muqaddimah” (Introduction), in which he studied how societies rise and fall, how economies work and how history should be written critically. Many historians regard it as a foundation of sociology and economics.',
    facts: ['He completed the Muqaddimah in 1377.', 'He proposed that societies follow cycles of rise and decline.', 'He stressed checking historical reports critically.'],
    lesson: 'Understanding why civilisations fall helps us build ones that last.',
    clues: ['wrote the “Muqaddimah” in 1377, studying how societies rise and decline', 'was born in Tunis and is called a pioneer of sociology', 'urged historians to test reports critically'],
  },
  {
    id: 'al-ghazali', name: 'Imam al-Ghazali', cat: 'scholars', icon: '🌙', years: '1058–1111', start: 1058, region: 'Tus, Baghdad & Damascus', wiki: 'Al-Ghazali',
    story: 'Al-Ghazali was a leading professor at the Nizamiyya school in Baghdad. At the height of his fame he went through a spiritual crisis, left his post and travelled for years, then returned to teaching and writing. His book “Ihya Ulum al-Din” (Revival of the Religious Sciences) joins law, belief and spiritual purification, and has been widely read for nearly a thousand years.',
    facts: ['He taught at the Nizamiyya in Baghdad.', 'He wrote “Ihya Ulum al-Din”.', 'He left teaching for years to renew his sincerity.'],
    lesson: 'Knowledge without a purified heart is incomplete.',
    clues: ['wrote “Ihya Ulum al-Din”, the Revival of the Religious Sciences', 'left a famous professorship in Baghdad after a spiritual crisis', 'taught at the Nizamiyya school and died in 1111'],
  },
  {
    id: 'imam-bukhari', name: 'Imam al-Bukhari', cat: 'scholars', icon: '📖', years: '810–870', start: 810, region: 'Bukhara', wiki: 'Muhammad al-Bukhari',
    story: 'Muhammad ibn Isma‘il al-Bukhari was born in Bukhara and, from a young age, travelled across the Muslim world to meet teachers of hadith. He is said to have spent about sixteen years compiling “al-Jami‘ al-Sahih”, selecting hadith from a far larger number he had collected. It is regarded by Sunni Muslims as the most authentic book after the Quran.',
    facts: ['He was born in Bukhara in 810.', 'He is said to have worked on his Sahih for about sixteen years.', 'Sahih al-Bukhari is the first of the “Six Books” of hadith.'],
    lesson: 'Careful, honest verification protects the religion’s sources.',
    clues: ['compiled the hadith collection that Sunni Muslims regard as the most authentic book after the Quran', 'was born in Bukhara in 810 and travelled widely to meet teachers', 'is said to have spent about sixteen years on his collection'],
  },
  {
    id: 'ibn-rushd', name: 'Ibn Rushd (Averroes)', cat: 'scholars', icon: '⚖️', years: '1126–1198', start: 1126, region: 'Córdoba & Marrakesh', wiki: 'Averroes',
    story: 'Ibn Rushd was a judge, physician and philosopher from Córdoba. He wrote famous commentaries on Aristotle, which were translated into Latin and influenced European thought, and also a major book of comparative Islamic law, “Bidayat al-Mujtahid”, explaining why scholars differ. He served as a judge in Seville and Córdoba and as physician to the Almohad caliph.',
    facts: ['He wrote commentaries on Aristotle.', 'Bidayat al-Mujtahid compares the opinions of the legal schools.', 'He served as a qadi (judge) and a court physician.'],
    lesson: 'Understanding why scholars differ makes us fair-minded.',
    clues: ['wrote the legal work “Bidayat al-Mujtahid” explaining the differences between the schools of law', 'was known in Europe for his commentaries on Aristotle', 'was a judge and physician from Córdoba'],
  },
  {
    id: 'imam-shafii', name: 'Imam al-Shafi‘i', cat: 'scholars', icon: '🧭', years: '767–820', start: 767, region: 'Gaza, Makkah, Baghdad, Cairo', wiki: "Al-Shafi'i",
    story: 'Muhammad ibn Idris al-Shafi‘i was born in Gaza, memorised the Quran as a child and studied with Imam Malik in Madinah. He later taught in Baghdad and Egypt. In his book “al-Risala” he set out how the Quran, the Sunnah, consensus and analogy are used to derive rulings — a founding text of usul al-fiqh. The Shafi‘i school of law is named after him.',
    facts: ['He studied under Imam Malik.', 'He wrote “al-Risala” on the principles of jurisprudence.', 'He died in Egypt in 820.'],
    lesson: 'Method and clarity in thinking protect the truth.',
    clues: ['wrote “al-Risala”, a founding book on the principles of jurisprudence', 'studied under Imam Malik and gave his name to one of the four Sunni schools', 'was born in Gaza and died in Egypt in 820'],
  },
  {
    id: 'abu-hanifa', name: 'Imam Abu Hanifa', cat: 'scholars', icon: '🕌', years: 'c. 699–767', start: 699, region: 'Kufa & Baghdad', wiki: 'Abu Hanifa',
    story: 'Al-Nu‘man ibn Thabit, known as Abu Hanifa, was a trader in Kufa who became a leading jurist. He was known for careful reasoning and for gathering a circle of students who debated questions until they reached agreement. The Hanafi school, named after him, became the most widely followed school of law in the Muslim world, especially in Turkey, Central Asia and South Asia.',
    facts: ['He lived in Kufa and died in 767.', 'He worked as a merchant.', 'The Hanafi school is named after him.'],
    lesson: 'Honest work and open discussion go well together with deep learning.',
    clues: ['was a cloth merchant of Kufa who founded the Hanafi school of law', 'is known for discussing legal questions with a circle of students', 'died in 767 and gave his name to the most widely followed school of law'],
  },
  {
    id: 'imam-nawawi', name: 'Imam al-Nawawi', cat: 'scholars', icon: '✍️', years: '1233–1277', start: 1233, region: 'Damascus', wiki: 'Al-Nawawi',
    story: 'Yahya al-Nawawi was born near Damascus and studied there with great dedication, often sleeping little. He lived simply and died at only 44, yet left works that are still read daily: “Riyad as-Salihin”, “al-Adhkar” and “Forty Hadith” (al-Arba‘un). His 40 hadith cover the core of Islam in short, memorable texts.',
    facts: ['He died at the age of 44 in 1277.', 'He wrote “Riyad as-Salihin” and “Al-Adhkar”.', 'His “Forty Hadith” is among the most memorised collections.'],
    lesson: 'Sincere effort fills a short life with lasting benefit.',
    clues: ['compiled “Riyad as-Salihin” and the Forty Hadith (al-Arba‘un)', 'died in 1277 at only 44, after a life of study in Damascus', 'wrote “Al-Adhkar”, a collection of remembrances'],
  },

  // ───────── Explorers & builders ─────────
  {
    id: 'ibn-battuta', name: 'Ibn Battuta', cat: 'explorers', icon: '🧳', years: '1304–1369', start: 1304, region: 'From Tangier across the world', wiki: 'Ibn Battuta',
    story: 'Ibn Battuta left Tangier at 21 to perform the Hajj, and kept travelling for nearly thirty years — through North Africa, Arabia, Persia, East Africa, Anatolia, Central Asia, India, the Maldives and China, covering about 120,000 km. He worked as a judge in places such as Delhi and recorded what he saw in the “Rihla”, one of the great travel books of history.',
    facts: ['He set out in 1325 and travelled for about 29 years.', 'He covered roughly 120,000 km.', 'His travel book is called the “Rihla”.'],
    lesson: 'Travel with open eyes, and the world teaches you.',
    clues: ['left Tangier at 21 and travelled for almost thirty years, covering about 120,000 km', 'wrote the travel book known as the “Rihla”', 'served as a judge in Delhi and visited places from West Africa to China'],
  },
  {
    id: 'al-idrisi', name: 'Al-Idrisi', cat: 'explorers', icon: '🗺️', years: 'c. 1100–1165', start: 1100, region: 'Ceuta, Palermo', wiki: 'Muhammad al-Idrisi',
    story: 'Muhammad al-Idrisi was a geographer born in Ceuta who worked at the court of King Roger II of Sicily in Palermo. In 1154 he completed a silver world map and a book of geography, the “Tabula Rogeriana” (“Nuzhat al-Mushtaq”), based on reports of travellers and merchants. It was one of the best maps of its time and was used for centuries.',
    facts: ['He finished the Tabula Rogeriana in 1154.', 'He worked for Roger II in Palermo.', 'The map placed south at the top, as many Islamic maps did.'],
    lesson: 'Gather many witnesses and compare them to draw a truer picture.',
    clues: ['completed the world map and geography book known as the Tabula Rogeriana in 1154', 'worked for King Roger II of Sicily in Palermo', 'was a geographer born in Ceuta who collected reports from travellers and merchants'],
  },
  {
    id: 'zheng-he', name: 'Zheng He', cat: 'explorers', icon: '🚢', years: '1371–1433', start: 1371, region: 'Ming China & the Indian Ocean', wiki: 'Zheng He',
    story: 'Zheng He was born into a Muslim family in Yunnan, in China. As an admiral of the Ming dynasty, between 1405 and 1433 he led seven great voyages with enormous fleets across the Indian Ocean to Southeast Asia, India, Arabia and East Africa. He carried gifts and trade goods, and is said to have visited Makkah, or sent members of his fleet there.',
    facts: ['He was born into a Muslim family in Yunnan.', 'He led seven voyages between 1405 and 1433.', 'His fleets reached as far as East Africa.'],
    lesson: 'Faith and service can go hand in hand with great enterprise.',
    clues: ['was a Muslim-born Chinese admiral who led seven voyages between 1405 and 1433', 'sailed vast fleets across the Indian Ocean to Arabia and East Africa', 'served the Ming emperors'],
  },
  {
    id: 'piri-reis', name: 'Piri Reis', cat: 'explorers', icon: '🧭', years: 'c. 1470–1553', start: 1470, region: 'The Ottoman Empire', wiki: 'Piri Reis',
    story: 'Piri Reis was an Ottoman admiral and mapmaker. In 1513 he drew a famous world map, of which a fragment survives, showing the Atlantic coasts of Europe, Africa and the Americas. In 1521 he wrote the “Kitab-ı Bahriye” (Book of the Sea), a detailed sailing guide to the Mediterranean with charts of ports and coasts.',
    facts: ['His world map dates from 1513.', 'He wrote the Kitab-ı Bahriye in 1521.', 'He served as an Ottoman naval commander.'],
    lesson: 'Maps are acts of service: they let others travel safely.',
    clues: ['drew a famous world map in 1513 showing the Atlantic coasts of Europe, Africa and the Americas', 'wrote the “Kitab-ı Bahriye”, the Book of the Sea', 'was an Ottoman admiral and mapmaker'],
  },
  {
    id: 'mimar-sinan', name: 'Mimar Sinan', cat: 'explorers', icon: '🕌', years: 'c. 1490–1588', start: 1490, region: 'Istanbul & Edirne', wiki: 'Mimar Sinan',
    story: 'Sinan was chief architect to three Ottoman sultans, including Suleiman. In a career of about fifty years he designed or oversaw hundreds of buildings — mosques, schools, bridges, baths and hospitals. He said the Süleymaniye Mosque in Istanbul (1557) was his apprentice work and the Selimiye Mosque in Edirne (1575), with its vast dome, his masterpiece.',
    facts: ['He served as chief architect for about fifty years.', 'The Süleymaniye was completed in 1557.', 'The Selimiye Mosque in Edirne is a UNESCO World Heritage Site.'],
    lesson: 'Excellence in craft is a form of worship.',
    clues: ['was chief architect to the Ottoman sultans, designing hundreds of buildings over fifty years', 'designed the Süleymaniye Mosque in Istanbul and the Selimiye Mosque in Edirne', 'called the Selimiye with its great dome his masterpiece'],
  },
]

export const getHeritage = (id: string) => HERITAGE.find((h) => h.id === id)
export const heritageIn = (cat: HeritageCategory) => HERITAGE.filter((h) => h.cat === cat)

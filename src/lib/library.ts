// The Library: a browsable catalogue of Islamic knowledge. Every title is a Wikipedia article (checked to exist), fetched live
// by the server so the text stays current. Nothing here is copied or stored — see lib/wiki.ts.

export type LibraryCategory = 'prophets' | 'companions' | 'history' | 'places' | 'scholars' | 'beliefs'

export const LIBRARY_CATEGORIES: { id: LibraryCategory; title: string; icon: string; blurb: string }[] = [
  { id: 'prophets', title: 'Prophets', icon: '🕊️', blurb: 'From Adam to Muhammad ﷺ' },
  { id: 'companions', title: 'Companions', icon: '🌿', blurb: 'The Sahaba and the family of the Prophet ﷺ' },
  { id: 'history', title: 'History', icon: '🏛️', blurb: 'Events and the great Muslim civilisations' },
  { id: 'places', title: 'Places', icon: '🕌', blurb: 'The holy sites and famous mosques' },
  { id: 'scholars', title: 'Scholars & scientists', icon: '📚', blurb: 'Imams, hadith masters and thinkers' },
  { id: 'beliefs', title: 'Beliefs & practice', icon: '🕯️', blurb: 'Pillars, worship, the unseen and daily life' },
]

export type LibraryEntry = {
  title: string // exact Wikipedia article title
  name: string // how we show it
  cat: LibraryCategory
  honorific?: string // shown after the name, e.g. ﷺ
  story?: string // matching Quran story id in lib/stories.ts
}

const P = 'عليه السلام'
const S = 'رضي الله عنه'
const SF = 'رضي الله عنها'

const prophet = (title: string, name: string, story?: string, honorific = P): LibraryEntry => ({ title, name, cat: 'prophets', honorific, story })
const sahabi = (title: string, name: string, honorific = S): LibraryEntry => ({ title, name, cat: 'companions', honorific })
const e = (cat: LibraryCategory, title: string, name = title, story?: string): LibraryEntry => ({ title, name, cat, story })

export const LIBRARY: LibraryEntry[] = [
  // ── Prophets ──
  prophet('Adam in Islam', 'Adam', 'habil-qabil'),
  prophet('Idris (prophet)', 'Idris', 'idris'),
  prophet('Noah in Islam', 'Nuh (Noah)', 'nuh'),
  prophet('Hud (prophet)', 'Hud', 'hud'),
  prophet('Salih', 'Salih', 'salih'),
  prophet('Abraham in Islam', 'Ibrahim (Abraham)', 'ibrahim'),
  prophet('Ishmael in Islam', 'Ismaʿil (Ishmael)', 'ismail'),
  prophet('Isaac in Islam', 'Ishaq (Isaac)', 'ishaq-yaqub'),
  prophet('Lot in Islam', 'Lut (Lot)', 'lut'),
  prophet('Jacob in Islam', 'Yaʿqub (Jacob)', 'ishaq-yaqub'),
  prophet('Joseph in Islam', 'Yusuf (Joseph)', 'yusuf'),
  prophet('Shuaib', 'Shuʿayb', 'shuayb'),
  prophet('Job in Islam', 'Ayyub (Job)', 'ayyub'),
  prophet('Dhul-Kifl', 'Dhul-Kifl'),
  prophet('Moses in Islam', 'Musa (Moses)', 'musa'),
  prophet('Aaron in Islam', 'Harun (Aaron)'),
  prophet('David in Islam', 'Dawud (David)', 'dawud'),
  prophet('Solomon in Islam', 'Sulayman (Solomon)', 'sulayman'),
  prophet('Elijah in Islam', 'Ilyas (Elijah)'),
  prophet('Elisha in Islam', 'Alyasaʿ (Elisha)'),
  prophet('Jonah in Islam', 'Yunus (Jonah)', 'yunus'),
  prophet('Zechariah in Islam', 'Zakariya (Zechariah)', 'zakariya'),
  prophet('John the Baptist in Islam', 'Yahya (John)', 'zakariya'),
  prophet('Jesus in Islam', 'Isa (Jesus)', 'isa'),
  prophet('Muhammad', 'Muhammad', 'first-revelation', 'ﷺ'),
  prophet('Mary in Islam', 'Maryam (Mary)', 'maryam', 'عليها السلام'),
  { title: 'Luqman', name: 'Luqman the Wise', cat: 'prophets', story: 'luqman' },
  { title: 'Dhu al-Qarnayn', name: 'Dhul-Qarnayn', cat: 'prophets', story: 'dhulqarnayn' },
  { title: 'Khidr', name: 'Al-Khidr', cat: 'prophets', story: 'musa-khidr' },

  // ── Companions & the Prophet's family ──
  sahabi('Abu Bakr', 'Abu Bakr as-Siddiq'),
  sahabi('Umar', 'ʿUmar ibn al-Khattab'),
  sahabi('Uthman', 'ʿUthman ibn ʿAffan'),
  sahabi('Ali', 'ʿAli ibn Abi Talib'),
  sahabi('Khadija bint Khuwaylid', 'Khadija bint Khuwaylid', SF),
  sahabi('Aisha', 'ʿAisha bint Abi Bakr', SF),
  sahabi('Fatima', 'Fatima az-Zahra', SF),
  sahabi('Umm Salama', 'Umm Salama', SF),
  sahabi('Sumayyah bint Khayyat', 'Sumayya bint Khayyat', SF),
  sahabi('Bilal ibn Rabah', 'Bilal ibn Rabah'),
  sahabi('Hamza ibn Abd al-Muttalib', 'Hamza ibn ʿAbd al-Muttalib'),
  sahabi('Khalid ibn al-Walid', 'Khalid ibn al-Walid'),
  sahabi('Salman the Persian', 'Salman al-Farisi'),
  sahabi('Abu Hurairah', 'Abu Hurayra'),
  sahabi('Abdullah ibn Abbas', 'ʿAbdullah ibn ʿAbbas'),
  sahabi("Mus'ab ibn 'Umair", 'Musʿab ibn ʿUmayr'),
  sahabi('Zayd ibn Thabit', 'Zayd ibn Thabit'),
  sahabi('Abu Ubayda ibn al-Jarrah', 'Abu ʿUbayda ibn al-Jarrah'),
  sahabi("Sa'd ibn Abi Waqqas", 'Saʿd ibn Abi Waqqas'),
  sahabi('Abd al-Rahman ibn Awf', 'ʿAbd ar-Rahman ibn ʿAwf'),
  sahabi('Zubayr ibn al-Awwam', 'az-Zubayr ibn al-ʿAwwam'),
  sahabi('Talha ibn Ubayd Allah', 'Talha ibn ʿUbaydullah'),
  sahabi('Ammar ibn Yasir', 'ʿAmmar ibn Yasir'),
  sahabi('Abu Dharr al-Ghifari', 'Abu Dharr al-Ghifari'),
  sahabi('Hasan ibn Ali', 'al-Hasan ibn ʿAli'),
  sahabi('Husayn ibn Ali', 'al-Husayn ibn ʿAli'),
  sahabi("Ja'far ibn Abi Talib", 'Jaʿfar ibn Abi Talib'),

  // ── History ──
  e('history', "Muhammad's first revelation", 'The first revelation', 'first-revelation'),
  e('history', 'Muhammad in Mecca', 'The Prophet ﷺ in Makkah'),
  e('history', 'Migration to Abyssinia', 'The migration to Abyssinia'),
  e('history', "Isra' and Mi'raj", 'The Night Journey (Isra & Miʿraj)', 'isra'),
  e('history', 'Hijra (Islam)', 'The Hijra', 'hijra'),
  e('history', 'Constitution of Medina', 'The Constitution of Madinah'),
  e('history', 'Muhammad in Medina', 'The Prophet ﷺ in Madinah'),
  e('history', 'Battle of Badr', 'The Battle of Badr', 'badr'),
  e('history', 'Battle of Uhud', 'The Battle of Uhud', 'uhud'),
  e('history', 'Battle of the Trench', 'The Battle of the Trench', 'khandaq'),
  e('history', 'Treaty of Hudaybiyyah', 'The Treaty of Hudaybiyyah', 'hudaybiyyah'),
  e('history', 'Conquest of Mecca', 'The Conquest of Makkah', 'fath'),
  e('history', 'Farewell Sermon', 'The Farewell Sermon'),
  e('history', 'Rashidun Caliphate', 'The Rightly-Guided Caliphs'),
  e('history', 'Battle of Yarmouk', 'The Battle of Yarmouk'),
  e('history', 'Umayyad Caliphate', 'The Umayyad Caliphate'),
  e('history', 'Abbasid Caliphate', 'The Abbasid Caliphate'),
  e('history', 'House of Wisdom', 'The House of Wisdom'),
  e('history', 'Islamic Golden Age', 'The Islamic Golden Age'),
  e('history', 'Al-Andalus', 'Al-Andalus'),
  e('history', 'Battle of Hattin', 'The Battle of Hattin'),
  e('history', 'Battle of Ain Jalut', 'The Battle of ʿAyn Jalut'),
  e('history', 'Ottoman Empire', 'The Ottoman Empire'),
  e('history', 'Fall of Constantinople', 'The Conquest of Constantinople'),
  e('history', 'Mughal Empire', 'The Mughal Empire'),
  e('history', 'Sunnah', 'The Sunnah'),

  // ── Places ──
  e('places', 'Mecca', 'Makkah al-Mukarramah'),
  e('places', 'Kaaba', 'The Kaʿbah'),
  e('places', 'Masjid al-Haram', 'Al-Masjid al-Haram'),
  e('places', 'Black Stone', 'The Black Stone (al-Hajar al-Aswad)'),
  e('places', 'Zamzam Well', 'The well of Zamzam'),
  e('places', 'Safa and Marwa', 'Safa and Marwa'),
  e('places', 'Mount Arafat', 'Mount ʿArafah'),
  e('places', 'Muzdalifah', 'Muzdalifah'),
  e('places', 'Mina, Saudi Arabia', 'Mina'),
  e('places', 'Cave of Hira', 'The Cave of Hira (Jabal an-Nur)'),
  e('places', 'Cave of Thawr', 'The Cave of Thawr'),
  e('places', 'Medina', 'Al-Madinah al-Munawwarah'),
  e('places', 'Al-Masjid an-Nabawi', "Al-Masjid an-Nabawi (the Prophet's Mosque)"),
  e('places', 'Quba Mosque', 'Masjid Quba'),
  e('places', "Al-Baqi'", 'Jannat al-Baqiʿ'),
  e('places', 'Mount Uhud', 'Mount Uhud'),
  e('places', 'Jerusalem', 'Al-Quds (Jerusalem)'),
  e('places', 'Al-Aqsa Mosque', 'Al-Masjid al-Aqsa'),
  e('places', 'Dome of the Rock', 'The Dome of the Rock'),
  e('places', 'Great Mosque of Kairouan', 'The Great Mosque of Kairouan'),
  e('places', 'Great Mosque of Cordoba', 'The Mosque of Córdoba'),
  e('places', 'Alhambra', 'The Alhambra'),
  e('places', 'Hagia Sophia', 'Hagia Sophia'),
  e('places', 'Blue Mosque, Istanbul', 'The Blue Mosque, Istanbul'),
  e('places', 'Sheikh Zayed Grand Mosque', 'Sheikh Zayed Grand Mosque'),
  e('places', 'Al-Azhar University', 'Al-Azhar'),
  e('places', 'Al-Qarawiyyin', 'Al-Qarawiyyin'),

  // ── Scholars & scientists ──
  e('scholars', 'Abu Hanifa', 'Imam Abu Hanifa'),
  e('scholars', 'Malik ibn Anas', 'Imam Malik'),
  e('scholars', "Muhammad ibn Idris al-Shafi'i", "Imam ash-Shafiʿi"),
  e('scholars', 'Ahmad ibn Hanbal', 'Imam Ahmad ibn Hanbal'),
  e('scholars', 'Muhammad al-Bukhari', 'Imam al-Bukhari'),
  e('scholars', 'Muslim ibn al-Hajjaj', 'Imam Muslim'),
  e('scholars', 'Al-Tirmidhi', 'Imam at-Tirmidhi'),
  e('scholars', 'Abu Dawood', 'Imam Abu Dawud'),
  e('scholars', "Al-Nasa'i", "Imam an-Nasaʾi"),
  e('scholars', 'Ibn Majah', 'Imam Ibn Majah'),
  e('scholars', 'Al-Nawawi', 'Imam an-Nawawi'),
  e('scholars', 'Ibn Hajar al-Asqalani', 'Ibn Hajar al-ʿAsqalani'),
  e('scholars', 'Al-Tabari', 'Imam at-Tabari'),
  e('scholars', 'Ibn Kathir', 'Ibn Kathir'),
  e('scholars', 'Al-Qurtubi', 'Imam al-Qurtubi'),
  e('scholars', 'Al-Suyuti', 'Imam as-Suyuti'),
  e('scholars', 'Al-Ghazali', 'Imam al-Ghazali'),
  e('scholars', 'Ibn Taymiyya', 'Ibn Taymiyyah'),
  e('scholars', 'Ibn al-Qayyim', 'Ibn al-Qayyim'),
  e('scholars', 'Hasan al-Basri', 'Al-Hasan al-Basri'),
  e('scholars', 'Rabia of Basra', 'Rabiʿa al-ʿAdawiyya'),
  e('scholars', 'Rumi', 'Jalal ad-Din Rumi'),
  e('scholars', 'Ibn Khaldun', 'Ibn Khaldun'),
  e('scholars', 'Ibn Battuta', 'Ibn Battuta'),
  e('scholars', 'Ibn Sina', 'Ibn Sina (Avicenna)'),
  e('scholars', 'Ibn Rushd', 'Ibn Rushd (Averroes)'),
  e('scholars', 'Al-Khwarizmi', 'Al-Khwarizmi'),
  e('scholars', 'Ibn al-Haytham', 'Ibn al-Haytham'),
  e('scholars', 'Al-Biruni', 'Al-Biruni'),
  e('scholars', 'Al-Zahrawi', 'Al-Zahrawi'),
  e('scholars', 'Al-Jazari', 'Ismaʿil al-Jazari'),
  e('scholars', 'Fatima al-Fihri', 'Fatima al-Fihri'),

  // ── Beliefs & practice ──
  e('beliefs', 'Five Pillars of Islam', 'The Five Pillars of Islam'),
  e('beliefs', 'Iman (Islam)', 'Iman and the six articles of faith'),
  e('beliefs', 'Tawhid', 'Tawhid'),
  e('beliefs', 'Shahada', 'The Shahada'),
  e('beliefs', 'Salah', 'Salah (prayer)'),
  e('beliefs', 'Wudu', 'Wudu'),
  e('beliefs', 'Ghusl', 'Ghusl'),
  e('beliefs', 'Adhan', 'The Adhan'),
  e('beliefs', "Jumu'ah", 'Jumuʿah (Friday prayer)'),
  e('beliefs', 'Qibla', 'The Qibla'),
  e('beliefs', 'Zakat', 'Zakat'),
  e('beliefs', 'Sawm', 'Sawm (fasting)'),
  e('beliefs', 'Ramadan', 'Ramadan'),
  e('beliefs', 'Laylat al-Qadr', 'Laylat al-Qadr'),
  e('beliefs', 'Hajj', 'Hajj'),
  e('beliefs', 'Umrah', 'Umrah'),
  e('beliefs', 'Eid al-Fitr', 'Eid al-Fitr'),
  e('beliefs', 'Eid al-Adha', 'Eid al-Adha'),
  e('beliefs', 'Ashura', 'Ashura'),
  e('beliefs', 'Islamic calendar', 'The Islamic calendar'),
  e('beliefs', 'Mawlid', 'Mawlid'),
  e('beliefs', 'Quran', 'The Quran'),
  e('beliefs', 'Tafsir', 'Tafsir'),
  e('beliefs', 'Tajwid', 'Tajwid'),
  e('beliefs', 'Hadith', 'Hadith'),
  e('beliefs', 'Sharia', 'Sharia'),
  e('beliefs', 'Fiqh', 'Fiqh'),
  e('beliefs', 'Dhikr', 'Dhikr'),
  e('beliefs', 'Dua', 'Duʿaʾ'),
  e('beliefs', 'Tawbah', 'Tawbah (repentance)'),
  e('beliefs', 'Ihsan', 'Ihsan'),
  e('beliefs', 'Sadaqah', 'Sadaqah'),
  e('beliefs', 'Waqf', 'Waqf'),
  e('beliefs', 'Names of God in Islam', 'The Names of Allah'),
  e('beliefs', 'Angels in Islam', 'Angels (Malaʾika)'),
  e('beliefs', 'Jinn', 'Jinn'),
  e('beliefs', 'Predestination in Islam', 'Qadar (divine decree)'),
  e('beliefs', 'Day of Resurrection', 'The Day of Judgement'),
  e('beliefs', 'Barzakh', 'Barzakh'),
  e('beliefs', 'As-Sirat', 'As-Sirat'),
  e('beliefs', 'Jannah', 'Jannah (Paradise)'),
  e('beliefs', 'Jahannam', 'Jahannam'),
  e('beliefs', 'Islamic funeral', 'Janazah (funeral)'),
  e('beliefs', 'Aqiqah', 'ʿAqiqah'),
  e('beliefs', 'Mahr', 'Mahr'),
  e('beliefs', 'Halal', 'Halal'),
  e('beliefs', 'Islamic dietary laws', 'Islamic dietary laws'),
  e('beliefs', 'Riba', 'Riba'),
  e('beliefs', 'Sufism', 'Sufism'),
  e('beliefs', 'Sunni Islam', 'Sunni Islam'),
  e('beliefs', 'Shia Islam', 'Shia Islam'),
  e('beliefs', 'Ibadi Islam', 'Ibadi Islam'),
]

export const findEntry = (title: string) => LIBRARY.find((x) => x.title.toLowerCase() === title.toLowerCase())

// Images are shown for places only: pictures that may depict the Prophets ﷺ, angels or companions are avoided on purpose.
export const imagesAllowed = (title: string) => findEntry(title)?.cat === 'places'

export const isSafeTitle = (t: string) => t.length > 0 && t.length <= 120 && /^[\p{L}\p{N} _().,'’\-–:&!?]+$/u.test(t)

// A fresh pick each day, same for everyone on the same date.
export function entryOfTheDay(dateKey: string): LibraryEntry {
  let h = 0
  for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return LIBRARY[h % LIBRARY.length]
}

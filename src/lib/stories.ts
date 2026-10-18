// Stories from the Quran. Each story is a list of chapters, each chapter a verse range.
// The app shows the actual verses (Arabic + translation) — no invented narration.
// Verse ranges are starting points for study; confirm against a tafsir for full context.

export type StoryChapter = { title: string; surah: number; from: number; to: number }
export type Story = { id: string; title: string; icon: string; summary: string; chapters: StoryChapter[] }

export const STORIES: Story[] = [
  {
    id: 'adam',
    title: 'Prophet Adam عليه السلام',
    icon: '🌍',
    summary: 'The creation of Adam, the angels, and the first test.',
    chapters: [
      { title: 'A vicegerent on earth', surah: 2, from: 30, to: 33 },
      { title: 'The prostration and the tree', surah: 2, from: 34, to: 39 },
    ],
  },
  {
    id: 'nuh',
    title: 'Prophet Nuh عليه السلام',
    icon: '🚢',
    summary: 'Patience in calling a people, and the ark.',
    chapters: [
      { title: 'The call to his people', surah: 11, from: 25, to: 34 },
      { title: 'The ark and the flood', surah: 11, from: 36, to: 48 },
    ],
  },
  {
    id: 'ibrahim',
    title: 'Prophet Ibrahim عليه السلام',
    icon: '🔥',
    summary: 'Tawhid, the idols, and the fire made cool.',
    chapters: [
      { title: 'Confronting the idols', surah: 21, from: 51, to: 67 },
      { title: 'The fire', surah: 21, from: 68, to: 70 },
    ],
  },
  {
    id: 'yusuf',
    title: 'Prophet Yusuf عليه السلام',
    icon: '🌟',
    summary: 'The best of stories: a dream, a well, trials and honour.',
    chapters: [
      { title: 'The dream and the brothers', surah: 12, from: 4, to: 18 },
      { title: 'The well and Egypt', surah: 12, from: 19, to: 34 },
      { title: 'Prison and the king’s dream', surah: 12, from: 35, to: 57 },
      { title: 'Reunion', surah: 12, from: 58, to: 101 },
    ],
  },
  {
    id: 'musa',
    title: 'Prophet Musa عليه السلام',
    icon: '🌊',
    summary: 'From the river to Pharaoh’s court and the call at the fire.',
    chapters: [
      { title: 'Birth and the river', surah: 28, from: 3, to: 13 },
      { title: 'Madyan', surah: 28, from: 14, to: 28 },
      { title: 'The call at the fire', surah: 28, from: 29, to: 35 },
      { title: 'Before Pharaoh', surah: 28, from: 36, to: 42 },
    ],
  },
  {
    id: 'kahf',
    title: 'Ashab al-Kahf (People of the Cave)',
    icon: '⛰️',
    summary: 'Youth who held to their faith and slept in a cave.',
    chapters: [
      { title: 'The youth flee', surah: 18, from: 9, to: 16 },
      { title: 'The long sleep', surah: 18, from: 17, to: 26 },
    ],
  },
  {
    id: 'dhulqarnayn',
    title: 'Dhul-Qarnayn',
    icon: '🧭',
    summary: 'A just ruler, his journeys, and the barrier.',
    chapters: [{ title: 'The journeys', surah: 18, from: 83, to: 98 }],
  },
  {
    id: 'maryam',
    title: 'Maryam عليها السلام and Isa عليه السلام',
    icon: '🌴',
    summary: 'The glad tidings and the birth of Isa.',
    chapters: [
      { title: 'Glad tidings', surah: 19, from: 16, to: 26 },
      { title: 'The infant speaks', surah: 19, from: 27, to: 36 },
    ],
  },
  {
    id: 'sulayman',
    title: 'Prophet Sulayman عليه السلام',
    icon: '👑',
    summary: 'Dominion over the winds, the jinn, birds and the ants.',
    chapters: [
      { title: 'The valley of the ants', surah: 27, from: 15, to: 19 },
      { title: 'The hoopoe and Queen of Saba', surah: 27, from: 20, to: 44 },
    ],
  },
  {
    id: 'yunus',
    title: 'Prophet Yunus عليه السلام',
    icon: '🐋',
    summary: 'In the belly of the whale: “There is no god but You.”',
    chapters: [{ title: 'The whale', surah: 37, from: 139, to: 148 }],
  },
  {
    id: 'ayyub',
    title: 'Prophet Ayyub عليه السلام',
    icon: '💎',
    summary: 'Patience through affliction.',
    chapters: [{ title: 'Patience rewarded', surah: 38, from: 41, to: 44 }],
  },
  // ───────── More prophets ─────────
  { id: 'idris', title: 'Prophet Idris عليه السلام', icon: '📜', summary: 'A truthful prophet raised to a high station.', chapters: [{ title: 'A high station', surah: 19, from: 56, to: 57 }] },
  {
    id: 'hud',
    title: 'Prophet Hud عليه السلام',
    icon: '🌪️',
    summary: 'The mighty people of ʿAad, and the wind that ended their pride.',
    chapters: [
      { title: 'The call to ʿAad', surah: 11, from: 50, to: 56 },
      { title: 'The punishment', surah: 11, from: 57, to: 60 },
    ],
  },
  {
    id: 'salih',
    title: 'Prophet Salih عليه السلام',
    icon: '🐪',
    summary: 'Thamud, the rocks of Al-Hijr and the she-camel.',
    chapters: [
      { title: 'The she-camel as a sign', surah: 7, from: 73, to: 79 },
      { title: 'The warning', surah: 11, from: 61, to: 68 },
    ],
  },
  {
    id: 'lut',
    title: 'Prophet Lut عليه السلام',
    icon: '🏜️',
    summary: 'A prophet who stood alone against a people who crossed every limit.',
    chapters: [
      { title: 'The warning', surah: 7, from: 80, to: 84 },
      { title: 'The angels arrive', surah: 11, from: 77, to: 83 },
    ],
  },
  {
    id: 'shuayb',
    title: 'Prophet Shuʿayb عليه السلام',
    icon: '⚖️',
    summary: 'Honest weights and measures in the land of Madyan.',
    chapters: [{ title: 'Give full measure', surah: 11, from: 84, to: 95 }],
  },
  {
    id: 'ismail',
    title: 'Ibrahim and Ismaʿil عليهما السلام',
    icon: '🕋',
    summary: 'The barren valley, the great test, and the house of Allah.',
    chapters: [
      { title: 'The barren valley', surah: 14, from: 37, to: 41 },
      { title: 'The great sacrifice', surah: 37, from: 99, to: 111 },
      { title: 'Raising the foundations', surah: 2, from: 125, to: 129 },
    ],
  },
  {
    id: 'ishaq-yaqub',
    title: 'Ishaq and Yaʿqub عليهما السلام',
    icon: '🌱',
    summary: 'Glad tidings to Ibrahim, and a father’s last counsel.',
    chapters: [
      { title: 'Glad tidings of Ishaq', surah: 11, from: 69, to: 73 },
      { title: 'Yaʿqub’s counsel', surah: 2, from: 132, to: 133 },
    ],
  },
  {
    id: 'dawud',
    title: 'Prophet Dawud عليه السلام',
    icon: '🎶',
    summary: 'Strength, wisdom and the Psalms; mountains and birds glorify with him.',
    chapters: [
      { title: 'Strength and wisdom', surah: 38, from: 17, to: 26 },
      { title: 'Iron made soft', surah: 34, from: 10, to: 11 },
    ],
  },
  {
    id: 'talut',
    title: 'Talut and Jalut',
    icon: '⚔️',
    summary: 'A small army, a river’s test, and a shepherd who defeated a giant.',
    chapters: [
      { title: 'A king is appointed', surah: 2, from: 246, to: 248 },
      { title: 'The river and the battle', surah: 2, from: 249, to: 251 },
    ],
  },
  {
    id: 'zakariya',
    title: 'Zakariya and Yahya عليهما السلام',
    icon: '🤲',
    summary: 'A quiet dua in old age, answered.',
    chapters: [
      { title: 'The secret call', surah: 19, from: 2, to: 11 },
      { title: 'Yahya, given wisdom as a child', surah: 19, from: 12, to: 15 },
    ],
  },
  {
    id: 'isa',
    title: 'Prophet Isa عليه السلام',
    icon: '✨',
    summary: 'Glad tidings, the signs given to him, and his raising.',
    chapters: [
      { title: 'Glad tidings', surah: 3, from: 45, to: 51 },
      { title: 'The table from heaven', surah: 5, from: 112, to: 115 },
      { title: 'Raised to Allah', surah: 4, from: 157, to: 158 },
    ],
  },
  {
    id: 'musa-exodus',
    title: 'Musa and Pharaoh: the Exodus',
    icon: '🌅',
    summary: 'The magicians who believed, the sea that parted, and the calf.',
    chapters: [
      { title: 'The magicians', surah: 20, from: 56, to: 70 },
      { title: 'The sea', surah: 26, from: 52, to: 68 },
      { title: 'The calf', surah: 20, from: 83, to: 98 },
    ],
  },
  {
    id: 'musa-khidr',
    title: 'Musa and al-Khidr',
    icon: '🧠',
    summary: 'A journey about knowledge, patience and what lies behind events.',
    chapters: [
      { title: 'The meeting', surah: 18, from: 60, to: 70 },
      { title: 'Three journeys', surah: 18, from: 71, to: 82 },
    ],
  },
  // ───────── Lessons from earlier nations ─────────
  { id: 'luqman', title: 'Luqman the Wise', icon: '🦉', summary: 'A father’s advice to his son.', chapters: [{ title: 'Advice to his son', surah: 31, from: 12, to: 19 }] },
  { id: 'qarun', title: 'Qarun (Korah)', icon: '💰', summary: 'Wealth, arrogance, and the earth that swallowed it.', chapters: [{ title: 'The treasure', surah: 28, from: 76, to: 82 }] },
  { id: 'habil-qabil', title: 'The two sons of Adam', icon: '🕊️', summary: 'The first sin and the first lesson about taqwa.', chapters: [{ title: 'The offering', surah: 5, from: 27, to: 31 }] },
  {
    id: 'garden-owners',
    title: 'The two gardens and the garden owners',
    icon: '🌾',
    summary: 'Gratitude, pride and the loss of a harvest.',
    chapters: [
      { title: 'The two gardens', surah: 18, from: 32, to: 44 },
      { title: 'The owners of the garden', surah: 68, from: 17, to: 33 },
    ],
  },
  { id: 'saba', title: 'The people of Saba', icon: '🌊', summary: 'A land of blessing that turned away from thankfulness.', chapters: [{ title: 'The dam', surah: 34, from: 15, to: 19 }] },
  { id: 'cow', title: 'The cow of Banu Israil', icon: '🐄', summary: 'A story about asking too many questions and obeying simply.', chapters: [{ title: 'The cow', surah: 2, from: 67, to: 73 }] },
  { id: 'fil', title: 'The Year of the Elephant', icon: '🐘', summary: 'The army that marched against the Kaaba.', chapters: [{ title: 'Surat al-Fil', surah: 105, from: 1, to: 5 }] },
  { id: 'ukhdud', title: 'The people of the trench', icon: '🔥', summary: 'Believers who stayed steadfast under persecution.', chapters: [{ title: 'The trench', surah: 85, from: 4, to: 9 }] },
  // ───────── Seerah: events of the Prophet’s life ﷺ ─────────
  {
    id: 'first-revelation',
    title: 'The first revelation ﷺ',
    icon: '📖',
    summary: '“Read!” — the beginning of the message, and comfort from Allah.',
    chapters: [
      { title: 'Iqraʾ', surah: 96, from: 1, to: 5 },
      { title: 'Arise and warn', surah: 74, from: 1, to: 7 },
      { title: 'Your Lord has not forsaken you', surah: 93, from: 1, to: 11 },
    ],
  },
  { id: 'isra', title: 'The Night Journey (Isra)', icon: '🌙', summary: 'From the Sacred Mosque to the farthest mosque.', chapters: [{ title: 'The journey', surah: 17, from: 1, to: 1 }, { title: 'The vision', surah: 53, from: 1, to: 18 }] },
  { id: 'hijra', title: 'The Hijra: the cave', icon: '🏔️', summary: '“Do not grieve; indeed Allah is with us.”', chapters: [{ title: 'Two in the cave', surah: 9, from: 40, to: 40 }] },
  {
    id: 'badr',
    title: 'The Battle of Badr',
    icon: '🛡️',
    summary: 'Help from Allah for a small band of believers.',
    chapters: [
      { title: 'The promise', surah: 8, from: 5, to: 12 },
      { title: 'Reminder of the help', surah: 3, from: 123, to: 127 },
    ],
  },
  {
    id: 'uhud',
    title: 'The Battle of Uhud',
    icon: '⛰️',
    summary: 'Lessons of obedience, patience and trust after a hard day.',
    chapters: [
      { title: 'Before the battle', surah: 3, from: 121, to: 122 },
      { title: 'The lesson', surah: 3, from: 152, to: 155 },
    ],
  },
  {
    id: 'khandaq',
    title: 'The Battle of the Trench',
    icon: '🌀',
    summary: 'A siege, a freezing wind, and firm belief.',
    chapters: [
      { title: 'The siege', surah: 33, from: 9, to: 11 },
      { title: 'True faith', surah: 33, from: 22, to: 25 },
    ],
  },
  {
    id: 'hudaybiyyah',
    title: 'The Treaty of Hudaybiyyah',
    icon: '🤝',
    summary: 'A treaty that looked like a setback and was called a clear victory.',
    chapters: [
      { title: 'A clear victory', surah: 48, from: 1, to: 4 },
      { title: 'The pledge under the tree', surah: 48, from: 18, to: 21 },
    ],
  },
  { id: 'fath', title: 'The Conquest of Makkah', icon: '🏁', summary: 'Victory, and the response of gratitude.', chapters: [{ title: 'When Allah’s help comes', surah: 110, from: 1, to: 3 }] },
]

// Which section of the Stories page a story belongs to.
export type StoryGroup = 'prophets' | 'nations' | 'seerah'
export const STORY_GROUPS: { id: StoryGroup; title: string; blurb: string }[] = [
  { id: 'prophets', title: 'The Prophets', blurb: 'Their calls, trials and patience' },
  { id: 'nations', title: 'Lessons from earlier nations', blurb: 'People and places the Quran uses as reminders' },
  { id: 'seerah', title: 'The life of the Prophet ﷺ', blurb: 'Events of the Seerah, in the words of the Quran' },
]
const NATIONS = new Set(['luqman', 'qarun', 'habil-qabil', 'garden-owners', 'saba', 'cow', 'fil', 'ukhdud', 'kahf', 'dhulqarnayn', 'talut'])
const SEERAH = new Set(['first-revelation', 'isra', 'hijra', 'badr', 'uhud', 'khandaq', 'hudaybiyyah', 'fath'])
export const groupOf = (s: Story): StoryGroup => (SEERAH.has(s.id) ? 'seerah' : NATIONS.has(s.id) ? 'nations' : 'prophets')

export const getStory = (id: string) => STORIES.find((s) => s.id === id)

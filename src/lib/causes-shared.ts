// Where zakat and sadaqah can go — shown on the Zakat page. The app never handles money: every card sends the visitor to
// the charity's own website. The list is edited by the owner in the control room; the starter list below is used until then.
// Shared by the browser and the server, so nothing server-only is imported here.

export const CAUSE_CATEGORIES = [
  { id: 'emergency', label: 'Emergency relief', icon: '🚑' },
  { id: 'orphans', label: 'Orphans & children', icon: '🧒' },
  { id: 'food', label: 'Food', icon: '🍞' },
  { id: 'water', label: 'Clean water', icon: '💧' },
  { id: 'refugees', label: 'Refugees & displaced', icon: '🏕️' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'health', label: 'Medical aid', icon: '🩺' },
  { id: 'debt', label: 'Debt & hardship', icon: '🤝' },
  { id: 'other', label: 'Other', icon: '💚' },
] as const
export type CauseCategory = (typeof CAUSE_CATEGORIES)[number]['id']

// "yes" = generally accepted as zakat, "depends" = only in some forms, "no" = sadaqah / sadaqah jariyah, not zakat
export type ZakatFit = 'yes' | 'depends' | 'no'
export const ZAKAT_FIT_LABEL: Record<ZakatFit, string> = { yes: 'Usually zakat-eligible', depends: 'Zakat-eligible in some forms', no: 'Sadaqah (not zakat)' }

export type CauseLink = { name: string; url: string }
export type Cause = {
  id: string
  title: string
  summary: string
  category: CauseCategory
  zakat: ZakatFit
  zakatNote: string
  links: CauseLink[]
  active: boolean
  regNumber?: string // the charity's registration, e.g. "Registered charity no. 328158 (England & Wales)"
  reportUrl?: string // a link to its annual report or financial statements
}

// A charity link must be a normal https address on a real-looking domain name. Refused on purpose: passwords in the address,
// raw IP numbers and internal names (used to hide where a link really goes), and look-alike "punycode" domains (xn--…).
export const isSafeCharityLink = (u: string): boolean => {
  try {
    const x = new URL(u)
    const host = x.hostname.toLowerCase()
    if (x.protocol !== 'https:' || x.username || x.password || x.port) return false
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) return false
    if (/^[0-9.]+$/.test(host) || host.split('.').some((p) => p.startsWith('xn--'))) return false
    if (!/[a-z]/.test(host.split('.').pop() ?? '')) return false
    return !/\.(localhost|local|internal|lan|test|example|invalid)$/.test(host) // names that only exist inside a private network
  } catch {
    return false
  }
}
const isHttps = isSafeCharityLink
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(CONTROL, '').trim().slice(0, max) : '')

// Checks a cause sent by the admin page. Returns null when anything important is wrong (so a typo never publishes a bad link).
export function parseCause(body: unknown): Cause | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const id = clean(b.id, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  const title = clean(b.title, 80)
  const summary = clean(b.summary, 300)
  const category = CAUSE_CATEGORIES.find((c) => c.id === b.category)?.id
  const zakat = (['yes', 'depends', 'no'] as const).find((z) => z === b.zakat)
  const zakatNote = clean(b.zakatNote, 400)
  const rawLinks = Array.isArray(b.links) ? b.links.slice(0, 6) : []
  const links: CauseLink[] = []
  for (const l of rawLinks) {
    const name = clean((l as CauseLink)?.name, 60)
    const url = clean((l as CauseLink)?.url, 300)
    if (!name || !isHttps(url)) return null // a bad link is refused, not silently dropped
    links.push({ name, url })
  }
  const regNumber = clean(b.regNumber, 120)
  const reportUrl = clean(b.reportUrl, 300)
  if (reportUrl && !isHttps(reportUrl)) return null // a bad report link is refused too
  if (!id || !title || !summary || !category || !zakat || !links.length) return null
  return { id, title, summary, category, zakat, zakatNote, links, active: b.active !== false, ...(regNumber ? { regNumber } : {}), ...(reportUrl ? { reportUrl } : {}) }
}

const NOTE = 'Not a fatwa — if unsure, ask a scholar, and ask the charity whether it runs a zakat-eligible fund.'

// A starter list of long-established organisations. The owner should check each one and edit this in the control room.
export const DEFAULT_CAUSES: Cause[] = [
  {
    id: 'gaza-relief',
    title: 'Gaza: emergency relief',
    summary: 'Food, clean water, shelter and medical care for families hit by the war and blockade.',
    category: 'emergency',
    zakat: 'depends',
    zakatNote: 'Relief given to people who are poor, needy or displaced is generally accepted as zakat. Choose the charity’s zakat-eligible fund. ' + NOTE,
    links: [
      { name: 'Islamic Relief', url: 'https://www.islamic-relief.org' },
      { name: 'Muslim Aid', url: 'https://www.muslimaid.org' },
      { name: 'Human Appeal', url: 'https://humanappeal.org' },
    ],
    active: true,
  },
  {
    id: 'orphans',
    title: 'Caring for orphans',
    summary: 'Monthly sponsorship that pays for an orphan’s food, school and healthcare.',
    category: 'orphans',
    zakat: 'depends',
    zakatNote: 'Orphan sponsorship is usually treated as sadaqah. An orphan who is also poor may receive zakat, so choose a programme that says its zakat fund is eligible. ' + NOTE,
    links: [
      { name: 'Penny Appeal', url: 'https://pennyappeal.org' },
      { name: 'Muslim Hands', url: 'https://muslimhands.org.uk' },
      { name: 'Islamic Relief', url: 'https://www.islamic-relief.org' },
    ],
    active: true,
  },
  {
    id: 'food',
    title: 'Feeding the hungry',
    summary: 'Food packs and hot meals for poor and famine-hit families.',
    category: 'food',
    zakat: 'yes',
    zakatNote: 'Giving food to those who are poor and needy is a classic use of zakat. ' + NOTE,
    links: [
      { name: 'Muslim Hands', url: 'https://muslimhands.org.uk' },
      { name: 'Penny Appeal', url: 'https://pennyappeal.org' },
    ],
    active: true,
  },
  {
    id: 'water',
    title: 'Clean water wells',
    summary: 'Wells and water points that serve a village for years — a lasting charity (sadaqah jariyah).',
    category: 'water',
    zakat: 'no',
    zakatNote: 'A well belongs to the community rather than to a poor person, so most scholars treat it as sadaqah, not zakat. ' + NOTE,
    links: [
      { name: 'Muslim Aid', url: 'https://www.muslimaid.org' },
      { name: 'Human Appeal', url: 'https://humanappeal.org' },
    ],
    active: true,
  },
  {
    id: 'refugees',
    title: 'Refugees and displaced families',
    summary: 'Shelter, winter support and food for people who have had to leave their homes.',
    category: 'refugees',
    zakat: 'yes',
    zakatNote: 'People stranded away from home and in need are among those zakat is for (including “the wayfarer”). ' + NOTE,
    links: [
      { name: 'Islamic Relief', url: 'https://www.islamic-relief.org' },
      { name: 'Human Appeal', url: 'https://humanappeal.org' },
    ],
    active: true,
  },
  {
    id: 'education',
    title: 'Education for poor students',
    summary: 'School fees, books and scholarships for children who could not otherwise attend.',
    category: 'education',
    zakat: 'depends',
    zakatNote: 'Support given to a poor student may be zakat; building a school is generally sadaqah. ' + NOTE,
    links: [{ name: 'Penny Appeal', url: 'https://pennyappeal.org' }],
    active: true,
  },
  {
    id: 'health',
    title: 'Medical aid',
    summary: 'Treatment, surgery and medicine for patients who cannot afford it.',
    category: 'health',
    zakat: 'depends',
    zakatNote: 'Treatment for a poor patient may be zakat; equipment for a hospital is generally sadaqah. ' + NOTE,
    links: [{ name: 'Islamic Relief', url: 'https://www.islamic-relief.org' }],
    active: true,
  },
]

// What the Quran says zakat may be given to (Surat at-Tawbah 9:60).
export const ZAKAT_RECIPIENTS: { name: string; arabic: string; meaning: string }[] = [
  { name: 'The poor', arabic: 'الفقراء', meaning: 'People whose means do not cover their basic needs.' },
  { name: 'The needy', arabic: 'المساكين', meaning: 'People in hardship who may have some means but not enough to live on.' },
  { name: 'Those who collect and distribute it', arabic: 'العاملين عليها', meaning: 'Trusted workers who gather and distribute zakat.' },
  { name: 'Those whose hearts are to be reconciled', arabic: 'المؤلفة قلوبهم', meaning: 'Those whose support for Islam or ties with Muslims are to be strengthened.' },
  { name: 'Freeing people from bondage', arabic: 'في الرقاب', meaning: 'Freeing slaves and captives.' },
  { name: 'People in debt', arabic: 'الغارمين', meaning: 'Those weighed down by debt they cannot pay.' },
  { name: 'In the cause of Allah', arabic: 'في سبيل الله', meaning: 'Efforts in Allah’s way; scholars differ on exactly what this covers.' },
  { name: 'The traveller in need', arabic: 'ابن السبيل', meaning: 'Someone stranded away from home without the means to continue or return.' },
]

// Tests the zakat causes list and the report form checks.  Run: npm run test:causes
import { CAUSE_CATEGORIES, DEFAULT_CAUSES, ZAKAT_RECIPIENTS, parseCause } from '../src/lib/causes-shared.ts'
import { REPORT_CATEGORIES, isUrgent } from '../src/lib/reports-shared.ts'
import { parseReport } from '../src/lib/reports.ts'
import { BEWARE, DUAS, QURAN_ITEMS } from '../src/lib/ruqyah.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── the starter list ─────────
ok('causes: the starter list covers Gaza relief and orphans (and more)', DEFAULT_CAUSES.some((c) => c.id === 'gaza-relief') && DEFAULT_CAUSES.some((c) => c.id === 'orphans') && DEFAULT_CAUSES.length >= 6)
ok('causes: every starter cause passes its own checks (https links, titles, notes)', DEFAULT_CAUSES.every((c) => parseCause(c) !== null))
ok('causes: ids are unique and every category exists', new Set(DEFAULT_CAUSES.map((c) => c.id)).size === DEFAULT_CAUSES.length && DEFAULT_CAUSES.every((c) => CAUSE_CATEGORIES.some((x) => x.id === c.category)))
ok('causes: every link is https and none carries a password', DEFAULT_CAUSES.flatMap((c) => c.links).every((l) => l.url.startsWith('https://') && !l.url.includes('@')))
ok('causes: water wells are sadaqah, not zakat (no person receives it)', DEFAULT_CAUSES.find((c) => c.id === 'water')?.zakat === 'no')
ok('causes: every cause says it is not a fatwa', DEFAULT_CAUSES.every((c) => /not a fatwa/i.test(c.zakatNote)))
ok('causes: the eight categories of 9:60 are listed', ZAKAT_RECIPIENTS.length === 8)

// ───────── what the owner can save ─────────
const good = { id: 'My Cause!', title: 'Winter blankets', summary: 'Blankets for families in cold camps.', category: 'refugees', zakat: 'yes', zakatNote: '', links: [{ name: 'Charity', url: 'https://example.org/appeal' }], active: true }
const parsed = parseCause(good)
ok('save: a good cause is accepted and its id is made URL-safe', !!parsed && parsed.id === 'my-cause')
ok('save: a link that is not https is refused (not quietly dropped)', parseCause({ ...good, links: [{ name: 'x', url: 'http://example.org' }] }) === null && parseCause({ ...good, links: [{ name: 'x', url: 'javascript:alert(1)' }] }) === null && parseCause({ ...good, links: [{ name: 'x', url: 'https://user:pw@example.org' }] }) === null)
ok('save: look-alike, raw-IP, internal and odd-port addresses are refused (classic phishing tricks)', ['https://127.0.0.1/pay', 'https://192.168.1.5/x', 'https://xn--islmic-relief-9cb.org', 'https://shop.xn--e1afmkfd.xn--p1ai', 'https://intranet.local/x', 'https://charity.internal/x', 'https://example.org:8443/x', 'https://localhost/x', 'https://charity/x', 'https://1.2.3.456/x'].every((u) => parseCause({ ...good, links: [{ name: 'x', url: u }] }) === null))
ok('save: normal charity addresses (with paths and query strings) are accepted', ['https://www.islamic-relief.org', 'https://humanappeal.org/gaza?utm=1', 'https://muslimhands.org.uk/appeals/gaza'].every((u) => parseCause({ ...good, links: [{ name: 'x', url: u }] }) !== null))
ok('save: a missing title, summary, link or a bad type is refused', parseCause({ ...good, title: '' }) === null && parseCause({ ...good, summary: '  ' }) === null && parseCause({ ...good, links: [] }) === null && parseCause({ ...good, category: 'nonsense' }) === null && parseCause({ ...good, zakat: 'maybe' }) === null && parseCause(null) === null && parseCause('x') === null)
ok('save: over-long text is cut to the limits', (parseCause({ ...good, title: 'T'.repeat(500) })?.title.length ?? 0) === 80 && (parseCause({ ...good, summary: 'S'.repeat(900) })?.summary.length ?? 0) === 300)
ok('save: at most six links are kept', (parseCause({ ...good, links: Array.from({ length: 12 }, (_, i) => ({ name: 'L' + i, url: 'https://example.org/' + i })) })?.links.length ?? 0) === 6)
ok('save: hiding a cause is remembered', parseCause({ ...good, active: false })?.active === false)

// ───────── reports ─────────
const rep = { category: 'content', message: 'The translation of this verse seems to have a typo in it.', page: '/quran/2', ref: 'Quran 2:255', contact: 'me@example.com' }
ok('report: a normal report is accepted', parseReport(rep)?.category === 'content' && parseReport(rep)?.ref === 'Quran 2:255')
ok('report: too short, no topic, or junk is refused', parseReport({ ...rep, message: 'bad' }) === null && parseReport({ ...rep, category: 'spam' }) === null && parseReport(null) === null && parseReport('x') === null && parseReport({}) === null)
ok('report: contact and reference are optional', (() => { const r = parseReport({ category: 'bug', message: 'The page does not open for me at all.' }); return !!r && r.contact === undefined && r.ref === undefined })())
ok('report: the page must be a path on this site (no outside addresses)', parseReport({ ...rep, page: 'https://evil.example/x' })?.page === '' && parseReport({ ...rep, page: '//evil.example' })?.page === '' && parseReport({ ...rep, page: '/hadith?book=bukhari&number=1#x' })?.page === '/hadith?book=bukhari&number=1')
ok('report: control characters are stripped and long text is cut', parseReport({ ...rep, message: 'a\u0000b\u0007c'.repeat(5) + ' enough text here' })?.message.includes('\u0000') === false && (parseReport({ ...rep, message: 'x'.repeat(5000) })?.message.length ?? 0) === 1500)
ok('report: content, prayer-time and abuse reports count as urgent', isUrgent('content') && isUrgent('prayer') && isUrgent('abuse') && !isUrgent('idea') && !isUrgent('bug') && REPORT_CATEGORIES.length === 6)

// ───────── ruqyah content ─────────
ok('ruqyah: every Qur’an item has a valid range and sources', QURAN_ITEMS.every((q) => q.surah >= 1 && q.surah <= 114 && q.from >= 1 && q.to >= q.from && q.sources.length > 0))
ok('ruqyah: the sources it links to are Bukhari/Muslim numbers that exist', [...QURAN_ITEMS.flatMap((q) => q.sources), ...DUAS.flatMap((d) => d.sources)].filter((s) => s.book).every((s) => (s.number ?? 0) > 0))
ok('ruqyah: every supplication has Arabic, a transliteration, a meaning and a source', DUAS.every((d) => /[؀-ۿ]/.test(d.arabic) && d.transliteration.length > 10 && d.meaning.length > 10 && d.sources.length > 0))
ok('ruqyah: the fraud warnings are present', BEWARE.length >= 4)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

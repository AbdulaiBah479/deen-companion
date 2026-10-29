// Tests the Support page rules: the public ledger arithmetic, the sponsor slot, the donation link, and the charity transparency fields.
// Run: npm run test:support
import { CURRENCIES, NO_SPONSOR, cents, donateLink, money, parseLedger, parseSponsor, summarize } from '../src/lib/support-shared.ts'
import { parseCause } from '../src/lib/causes-shared.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

const good = { currency: 'USD', months: [{ month: '2026-12', income: [{ label: 'Supporters', amount: 50 }], costs: [{ label: 'Hosting', amount: 20 }, { label: 'Domain', amount: 1.25 }], note: 'Second month' }, { month: '2026-11', income: [{ label: 'Supporters', amount: 85.5 }, { label: 'Sponsor', amount: 50 }], costs: [{ label: 'Hosting', amount: 20 }], note: '' }] }
const l = parseLedger(good)
ok('ledger: a good ledger is accepted and the months are put in order', !!l && l.months[0].month === '2026-11' && l.months[1].month === '2026-12')
const s = summarize(l!)
ok('ledger: income, costs and the running balance add up exactly (to the cent)', s.income === 185.5 && s.costs === 41.25 && s.balance === 144.25 && s.rows[0].month === '2026-12' && s.rows[0].balance === 144.25 && s.rows[1].balance === 115.5, JSON.stringify([s.income, s.costs, s.balance]))
ok('ledger: decimal sums do not drift (0.1 + 0.2)', cents(0.1 + 0.2) === 0.3 && summarize(parseLedger({ currency: 'USD', months: [{ month: '2026-01', income: [{ label: 'a', amount: 0.1 }, { label: 'b', amount: 0.2 }], costs: [], note: '' }] })!).income === 0.3)
ok('ledger: an empty ledger is fine and summarises to zero', summarize(parseLedger({ currency: 'EUR', months: [] })!).balance === 0)
ok('ledger: one bad line refuses the whole save (negative, not a number, no label, too big)', [-1, 'x', NaN, 1e9].every((a) => parseLedger({ currency: 'USD', months: [{ month: '2026-01', income: [{ label: 'a', amount: a }], costs: [], note: '' }] }) === null) && parseLedger({ currency: 'USD', months: [{ month: '2026-01', income: [{ label: '', amount: 5 }], costs: [], note: '' }] }) === null)
ok('ledger: bad or repeated months are refused', parseLedger({ currency: 'USD', months: [{ month: '2026-13', income: [], costs: [], note: '' }] }) === null && parseLedger({ currency: 'USD', months: [{ month: '2026-01', income: [], costs: [], note: '' }, { month: '2026-01', income: [], costs: [], note: '' }] }) === null)
ok('ledger: not an object, or too many months, is refused', parseLedger(null) === null && parseLedger('x') === null && parseLedger({ currency: 'USD', months: Array.from({ length: 40 }, (_, i) => ({ month: `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, income: [], costs: [], note: '' })) }) === null)
ok('ledger: an unknown currency becomes USD, tags are stripped from labels', parseLedger({ currency: 'XXX', months: [{ month: '2026-01', income: [{ label: '<b>Gift</b>', amount: 5 }], costs: [], note: '' }] })!.currency === 'USD' && parseLedger({ currency: 'USD', months: [{ month: '2026-01', income: [{ label: '<b>Gift</b>', amount: 5 }], costs: [], note: '' }] })!.months[0].income[0].label === 'bGift/b')
ok('money: formats with the currency and never throws on an odd code', money(1234.5, 'USD') === '$1,234.50' && money(5, 'ZZZ').includes('5') && CURRENCIES.includes('SLE'))

ok('sponsor: a good sponsor is accepted', parseSponsor({ active: true, name: 'Al-Noor Bookshop', line: 'Islamic books and gifts', url: 'https://alnoor.example.com/shop' })?.active === true)
ok('sponsor: only https links on real domains (no http, javascript:, passwords, raw IPs, odd ports, look-alike punycode)', ['http://shop.com', 'javascript:alert(1)', 'https://u:p@shop.com', 'https://127.0.0.1/x', 'https://shop.com:8443/x', 'https://xn--pple-43d.com', 'data:text/html,hi', 'ftp://shop.com', 'shop.com'].every((url) => parseSponsor({ active: true, name: 'A', line: 'B', url }) === null))
ok('sponsor: switched off and empty is allowed (no sponsor), but a half-filled one is refused', parseSponsor({ active: false, name: '', line: '', url: '' }) === NO_SPONSOR && parseSponsor({ active: true, name: 'A', line: '', url: 'https://a.com' }) === null && parseSponsor({ active: true, name: '', line: 'x', url: 'https://a.com' }) === null)
ok('sponsor: a sponsor can be saved switched off with its details kept', parseSponsor({ active: false, name: 'A', line: 'B', url: 'https://a.com' })?.active === false)
ok('donation link: https only, else nothing is shown', donateLink('https://opencollective.com/deen-companion') === 'https://opencollective.com/deen-companion' && donateLink('http://x.com') === null && donateLink('javascript:alert(1)') === null && donateLink(undefined) === null && donateLink('') === null)

const base = { id: 'x', title: 'X', summary: 'Y', category: 'food', zakat: 'yes', zakatNote: 'Not a fatwa', links: [{ name: 'X', url: 'https://x.org' }] }
ok('charity details: registration number and report link are kept when given', (() => { const c = parseCause({ ...base, regNumber: 'Registered charity no. 328158 (England & Wales)', reportUrl: 'https://x.org/report.pdf' }); return c?.regNumber?.startsWith('Registered') === true && c.reportUrl === 'https://x.org/report.pdf' })())
ok('charity details: they are optional, and a bad report link refuses the cause', parseCause(base)?.regNumber === undefined && parseCause({ ...base, reportUrl: 'http://x.org/r' }) === null && parseCause({ ...base, reportUrl: 'javascript:alert(1)' }) === null)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

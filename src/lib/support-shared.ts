// "Support the app": the public money ledger (what came in, what was spent, what is left) and the one labelled sponsor slot.
// Pure rules shared by the browser and the server. Nothing here handles money: the owner types the figures in the control room,
// and the real payments happen on the donation service's own page (Open Collective, GitHub Sponsors, Ko-fi, Stripe…).
import { isSafeCharityLink } from './causes-shared'

export type Line = { label: string; amount: number }
export type LedgerMonth = { month: string; income: Line[]; costs: Line[]; note: string }
export type Ledger = { currency: string; months: LedgerMonth[] }

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max) : '')
export const cents = (n: number) => Math.round(n * 100) / 100

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'SLE', 'NGN', 'GHS', 'KES', 'PKR', 'INR', 'MYR', 'IDR', 'TRY', 'AED', 'SAR', 'CAD', 'AUD'] as const
export const EMPTY_LEDGER: Ledger = { currency: 'USD', months: [] }

function parseLines(raw: unknown): Line[] | null {
  if (!Array.isArray(raw)) return raw === undefined ? [] : null
  const out: Line[] = []
  for (const l of raw.slice(0, 30)) {
    const label = clean((l as Line)?.label, 60)
    const amount = Number((l as Line)?.amount)
    if (!label || !Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return null // a bad line is refused, not silently dropped
    out.push({ label, amount: cents(amount) })
  }
  return out
}

export function parseLedger(raw: unknown): Ledger | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const currency = (CURRENCIES as readonly string[]).includes(String(b.currency)) ? String(b.currency) : 'USD'
  if (!Array.isArray(b.months) || b.months.length > 36) return null
  const seen = new Set<string>()
  const months: LedgerMonth[] = []
  for (const m of b.months) {
    const month = clean((m as LedgerMonth)?.month, 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || seen.has(month)) return null
    seen.add(month)
    const income = parseLines((m as LedgerMonth).income)
    const costs = parseLines((m as LedgerMonth).costs)
    if (!income || !costs) return null
    months.push({ month, income, costs, note: clean((m as LedgerMonth).note, 300) })
  }
  months.sort((a, b2) => a.month.localeCompare(b2.month))
  return { currency, months }
}

export const sum = (lines: Line[]) => cents(lines.reduce((s, l) => s + l.amount, 0))

// Each month's income, costs and net, and the balance carried forward from the start. Newest month first.
export function summarize(ledger: Ledger) {
  let balance = 0
  const rows = ledger.months.map((m) => {
    const income = sum(m.income)
    const costs = sum(m.costs)
    balance = cents(balance + income - costs)
    return { ...m, totalIncome: income, totalCosts: costs, net: cents(income - costs), balance }
  })
  return {
    rows: rows.slice().reverse(),
    income: cents(rows.reduce((s, r) => s + r.totalIncome, 0)),
    costs: cents(rows.reduce((s, r) => s + r.totalCosts, 0)),
    balance,
  }
}

export function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

// ───────── the sponsor slot ─────────
export type Sponsor = { active: boolean; name: string; line: string; url: string }
export const NO_SPONSOR: Sponsor = { active: false, name: '', line: '', url: '' }

// Same rules as charity links: https only, a real domain name, no password in the address, no raw IP numbers.
export function parseSponsor(raw: unknown): Sponsor | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const name = clean(b.name, 50)
  const line = clean(b.line, 90)
  const url = clean(b.url, 300)
  const active = b.active === true
  if (!active && !name && !line && !url) return NO_SPONSOR
  if (!name || !line || !isSafeCharityLink(url)) return null
  return { active, name, line, url }
}

// A donation link must follow the same rules as a charity link.
export const donateLink = (u: string | undefined): string | null => (u && isSafeCharityLink(u.trim()) ? u.trim() : null)

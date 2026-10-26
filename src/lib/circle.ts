// Family Circle: a small private group (a family, a class) that checks in each day they read Quran, sees each other's streaks, and
// shares a "verse of the week". There are no accounts: a circle is a short code, and each person is a name plus a random id kept on
// their own device. Only first names (or nicknames) and the days they checked in are stored. These are the pure rules.
import { TOPICS } from './khutbah'

export const MAX_MEMBERS = 12
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L, easy to read out loud
export const CODE_LENGTH = 6
export const TTL_SECONDS = 120 * 86400 // a circle nobody uses for four months is forgotten
export const KEEP_DAYS = 60

export const codeFrom = (bytes: number[]) => bytes.slice(0, CODE_LENGTH).map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
export const isCode = (s: unknown): s is string => typeof s === 'string' && new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(s)
export const normalizeCode = (s: unknown) => (typeof s === 'string' ? s.toUpperCase().replace(/[^A-Z0-9]/g, '') : '')
export const isDevice = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(s)

// A name people see: letters, numbers, spaces and a few marks; no tags, no links, no long text.
export function cleanName(raw: unknown, max = 20): string {
  if (typeof raw !== 'string') return ''
  const s = raw.replace(/<[^>]*>/g, '').replace(/[<>&"`\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).trim()
  if (!/\p{L}/u.test(s) || /https?:|www\./i.test(s)) return ''
  return s
}

export const isDateKey = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))
const dayNumber = (key: string) => Math.floor(Date.parse(key + 'T00:00:00Z') / 86400_000)

// A check-in may be for the server's today or a day either side (time zones), never further.
export const dateAllowed = (key: string, serverToday: string) => isDateKey(key) && Math.abs(dayNumber(key) - dayNumber(serverToday)) <= 1

// Days in a row up to today (or up to yesterday, if today is not done yet: the streak is not lost until the day ends).
export function streakOf(days: string[], today: string): number {
  const set = new Set(days)
  let d = dayNumber(today)
  const key = (n: number) => new Date(n * 86400_000).toISOString().slice(0, 10)
  if (!set.has(key(d))) d -= 1
  let n = 0
  while (set.has(key(d))) {
    n++
    d -= 1
  }
  return n
}

// How many of the last seven days (today included) were checked in.
export function weekCount(days: string[], today: string): number {
  const t = dayNumber(today)
  return new Set(days.filter((k) => isDateKey(k) && t - dayNumber(k) >= 0 && t - dayNumber(k) < 7)).size
}

export function addDay(days: string[], key: string): string[] {
  return [...new Set([...days, key])].sort().slice(-KEEP_DAYS)
}

// The verse of the week: one of the verses already checked in the sermon library, the same for everyone in the same week.
const WEEKLY = [...new Set(TOPICS.flatMap((t) => t.quran).filter((r) => !r.includes('-')))]
export const weekIndex = (today: string) => Math.floor((dayNumber(today) + 3) / 7) // weeks start on Monday
export const weeklyVerse = (today: string) => WEEKLY[weekIndex(today) % WEEKLY.length]
export const QUESTIONS = [
  'What does this verse ask of us this week?',
  'Which word in it stands out to you, and why?',
  'Where have you seen this verse true in your own life?',
  'What is one small thing each of us can do because of it?',
]
export const weeklyQuestion = (today: string) => QUESTIONS[weekIndex(today) % QUESTIONS.length]

export type Member = { name: string; joined: string; days: string[] }
export type MemberView = { name: string; me: boolean; streak: number; week: number; today: boolean }
export function viewOf(members: Record<string, Member>, myHash: string, today: string): MemberView[] {
  return Object.entries(members)
    .map(([h, m]) => ({ name: m.name, me: h === myHash, streak: streakOf(m.days, today), week: weekCount(m.days, today), today: m.days.includes(today), at: m.joined }))
    .sort((a, b) => b.streak - a.streak || b.week - a.week || a.at.localeCompare(b.at))
    .map(({ name, me, streak, week, today }) => ({ name, me, streak, week, today }))
}

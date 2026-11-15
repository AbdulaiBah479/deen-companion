// Reflection journal: short notes about a verse, a hadith or a dua, kept on the device (and synced if you sign in).
export type Entry = { id: string; at: number; ref: string; text: string }
export const MAX_ENTRIES = 500
export const MAX_TEXT = 2000

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
// "2:255", "Bukhari 1", or free text up to 60 characters.
export const cleanRef = (s: unknown) => (typeof s === 'string' ? s.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, 60) : '')
export const cleanText = (s: unknown) => (typeof s === 'string' ? s.replace(CONTROL, '').trim().slice(0, MAX_TEXT) : '')

export function cleanEntries(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return []
  const out: Entry[] = []
  for (const e of raw.slice(0, MAX_ENTRIES)) {
    const text = cleanText((e as Entry)?.text)
    const at = Number((e as Entry)?.at)
    const id = typeof (e as Entry)?.id === 'string' ? (e as Entry).id.slice(0, 40) : ''
    if (text && id && Number.isFinite(at)) out.push({ id, at, ref: cleanRef((e as Entry).ref), text })
  }
  return out
}

// A new entry goes first. Returns the same list when the text is empty or the journal is full.
export function addEntry(list: Entry[], ref: string, text: string, now = Date.now()): Entry[] {
  const t = cleanText(text)
  if (!t || list.length >= MAX_ENTRIES) return list
  return [{ id: `${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, at: now, ref: cleanRef(ref), text: t }, ...list]
}
export const updateEntry = (list: Entry[], id: string, text: string): Entry[] => {
  const t = cleanText(text)
  return t ? list.map((e) => (e.id === id ? { ...e, text: t } : e)) : list
}
export const removeEntry = (list: Entry[], id: string): Entry[] => list.filter((e) => e.id !== id)
export const searchEntries = (list: Entry[], q: string): Entry[] => {
  const n = q.trim().toLowerCase()
  return n ? list.filter((e) => `${e.ref} ${e.text}`.toLowerCase().includes(n)) : list
}

// A plain-text copy of the whole journal, newest first.
export function exportText(list: Entry[]): string {
  return list.map((e) => `${new Date(e.at).toISOString().slice(0, 10)}${e.ref ? ' · ' + e.ref : ''}\n${e.text}`).join('\n\n———\n\n') + '\n'
}

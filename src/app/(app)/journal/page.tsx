'use client'

import { useState } from 'react'
import { MAX_TEXT, addEntry, cleanEntries, exportText, removeEntry, searchEntries, updateEntry, type Entry } from '@/lib/journal'
import { useStored } from '@/lib/storage'

const field = 'w-full rounded-xl border border-gray-300 p-2 text-sm'

export default function JournalPage() {
  const [raw, setRaw] = useStored<Entry[]>('deen:journal', [])
  const list = cleanEntries(raw)
  const [ref, setRef] = useState('')
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const shown = searchEntries(list, q)

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportText(list)], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-reflections.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#0F766E]">Reflection journal</h1>
        <p className="text-sm text-gray-600 mt-1">Write what a verse, hadith or dua made you think or feel. Private to you: kept on this device (and synced to your account only if you sign in).</p>
      </div>

      <form
        className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          const next = addEntry(list, ref, text)
          if (next !== list) {
            setRaw(next)
            setText('')
            setRef('')
          }
        }}
      >
        <label className="block text-sm font-semibold">About (optional)
          <input value={ref} onChange={(e) => setRef(e.target.value.slice(0, 60))} className={`${field} mt-1`} placeholder="e.g. 2:286, or Bukhari 1, or Dua before sleep" aria-label="What is this about" />
        </label>
        <label className="block text-sm font-semibold">My reflection
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))} rows={4} className={`${field} mt-1`} aria-label="My reflection" />
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{text.length}/{MAX_TEXT}</span>
          <button type="submit" disabled={!text.trim()} className="rounded-xl bg-[#0F766E] text-white px-4 py-2 font-semibold disabled:opacity-40">Save</button>
        </div>
      </form>

      {list.length > 0 && (
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} className={field} placeholder="Search my reflections" aria-label="Search my reflections" />
          <button type="button" onClick={download} className="shrink-0 rounded-xl border border-gray-300 px-3 text-sm">Download</button>
        </div>
      )}

      {list.length === 0 && <p className="text-sm text-gray-500" data-testid="journal-empty">Nothing yet. Your first reflection will appear here.</p>}
      {list.length > 0 && shown.length === 0 && <p className="text-sm text-gray-500">No reflection matches “{q}”.</p>}

      <ul className="space-y-3">
        {shown.map((e) => (
          <li key={e.id} className="rounded-2xl border border-gray-200 bg-white p-4" data-testid="journal-entry">
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>{new Date(e.at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}{e.ref ? ` · ${e.ref}` : ''}</span>
              <span className="flex gap-3">
                <button type="button" className="underline" onClick={() => { setEditing(e.id); setDraft(e.text) }}>Edit</button>
                <button type="button" className="underline text-red-700" onClick={() => { if (window.confirm('Delete this reflection?')) setRaw(removeEntry(list, e.id)) }}>Delete</button>
              </span>
            </div>
            {editing === e.id ? (
              <div className="mt-2 space-y-2">
                <textarea value={draft} onChange={(ev) => setDraft(ev.target.value.slice(0, MAX_TEXT))} rows={4} className={field} aria-label="Edit reflection" />
                <div className="flex gap-2">
                  <button type="button" className="rounded-xl bg-[#0F766E] text-white px-3 py-1.5 text-sm" onClick={() => { setRaw(updateEntry(list, e.id, draft)); setEditing(null) }}>Save changes</button>
                  <button type="button" className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm whitespace-pre-wrap">{e.text}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

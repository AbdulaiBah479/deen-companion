'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAudio } from '@/lib/audio'
import { EACH_CHOICES, LOOP_CHOICES, PRESETS, addPlan, cleanPlans, estimateMinutes, fixPlan, planLabel, removePlan, totalPlays, type ListenPlan } from '@/lib/listen-plan'
import { PAUSE_CHOICES } from '@/lib/playback'
import { useStored } from '@/lib/storage'
import type { SurahInfo } from '@/lib/surah-list'

const sel = 'w-full rounded-xl border border-gray-300 bg-white p-2 text-sm'
const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm ${on ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-gray-300'}`
const times = (n: number) => (n === 0 ? '∞' : `${n}×`)

// The "Listen" tab of the Quran page: pick a surah and the verses you want, say how many times each verse and the whole part repeat,
// and play. Plans you use again can be saved. Plays in the app's audio player, so it keeps going while you browse the app.
export default function ListenPlanner({ surahs }: { surahs: SurahInfo[] }) {
  const audio = useAudio()
  const [raw, setRaw] = useStored<ListenPlan[]>('deen:listen-plans', [])
  const plans = cleanPlans(raw)
  const [surah, setSurah] = useState(1)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(7)
  const [each, setEach] = useState<number>(1)
  const [loops, setLoops] = useState<number>(1)
  const [pause, setPause] = useState<'none' | 'short' | 'echo'>('none')
  const [note, setNote] = useState('')

  const info = surahs.find((s) => s.id === surah)
  const verses = info?.verses_count ?? 286
  const plan = useMemo(() => fixPlan({ surah, from, to, each, loops, pause }, verses), [surah, from, to, each, loops, pause, verses])
  const mins = estimateMinutes(plan)
  const total = totalPlays(plan)

  // A link such as /quran#listen=18 opens with that surah chosen.
  useEffect(() => {
    const m = location.hash.match(/listen=(\d{1,3})/)
    if (m) {
      const n = Math.min(114, Math.max(1, Number(m[1])))
      setSurah(n)
      setFrom(1)
      const v = surahs.find((s) => s.id === n)?.verses_count
      if (v) setTo(v)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahs.length])

  function pickSurah(n: number) {
    setSurah(n)
    setFrom(1)
    setTo(surahs.find((s) => s.id === n)?.verses_count ?? 7)
    setNote('')
  }
  const apply = (p: { surah: number; from: number; to: number; each: number; loops: number; pause?: 'none' | 'short' | 'echo' }) => {
    setSurah(p.surah)
    setFrom(p.from)
    setTo(p.to)
    setEach(p.each)
    setLoops(p.loops)
    if (p.pause) setPause(p.pause)
  }
  function play(p: Omit<ListenPlan, 'id'>) {
    audio.setRepeat('off')
    audio.setRepeatEach(p.each)
    audio.setPause(p.pause)
    audio.playRange(p.surah, p.from, p.to, p.loops)
    setNote(`Playing ${planLabel(p)}. Use the player at the bottom to pause or skip.`)
  }

  return (
    <div className="space-y-4" data-testid="listen-planner">
      <p className="text-sm text-gray-600">Choose what to hear and how many times. For memorising, repeat each verse; for sleep or reflection, repeat the whole part.</p>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3" aria-label="Choose a part">
        <label className="block text-sm font-semibold">Surah
          <select value={surah} onChange={(e) => pickSurah(Number(e.target.value))} className={`${sel} mt-1`} aria-label="Surah">
            {(surahs.length ? surahs : [{ id: 1, name_simple: 'Al-Fatihah', verses_count: 7 } as SurahInfo]).map((s) => (
              <option key={s.id} value={s.id}>{s.id}. {s.name_simple} ({s.verses_count})</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">From verse
            <select value={plan.from} onChange={(e) => { const f = Number(e.target.value); setFrom(f); if (to < f) setTo(f) }} className={`${sel} mt-1`} aria-label="From verse">
              {Array.from({ length: verses }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">To verse
            <select value={plan.to} onChange={(e) => setTo(Number(e.target.value))} className={`${sel} mt-1`} aria-label="To verse">
              {Array.from({ length: verses - plan.from + 1 }, (_, i) => plan.from + i).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(false)} onClick={() => { setFrom(1); setTo(verses) }}>Whole surah</button>
          <button type="button" className={chip(false)} onClick={() => setTo(plan.from)}>Just verse {plan.from}</button>
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">Each verse, how many times?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Times each verse is heard">
            {EACH_CHOICES.map((n) => <button key={n} type="button" aria-pressed={plan.each === n} className={chip(plan.each === n)} onClick={() => setEach(n)}>{times(n)}</button>)}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-1">The whole part, how many times?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Times the whole part is repeated">
            {LOOP_CHOICES.map((n) => <button key={n} type="button" aria-pressed={plan.loops === n} className={chip(plan.loops === n)} onClick={() => setLoops(n)}>{times(n)}</button>)}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-1">Pause after each verse</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Pause after each verse">
            {PAUSE_CHOICES.map((p) => <button key={p.id} type="button" aria-pressed={plan.pause === p.id} className={chip(plan.pause === p.id)} onClick={() => setPause(p.id)}>{p.label}</button>)}
          </div>
          <p className="text-xs text-gray-500 mt-1">“Your turn” waits as long as the verse so you can repeat after the reciter.</p>
        </div>

        <p className="text-sm rounded-xl bg-teal-50 border border-teal-200 p-2" data-testid="plan-summary">
          {info?.name_simple ?? `Surah ${plan.surah}`} {plan.from}{plan.to > plan.from ? `–${plan.to}` : ''}: {plan.to - plan.from + 1} {plan.to === plan.from ? 'verse' : 'verses'}, each {times(plan.each)}, whole part {times(plan.loops)}.{' '}
          {total === null ? 'It plays until you stop it.' : `${total} recitations, about ${mins} ${mins === 1 ? 'minute' : 'minutes'}.`}
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => play(plan)} className="rounded-xl bg-[#0F766E] text-white px-5 py-2.5 font-semibold" data-testid="plan-play">▶ Play</button>
          <button type="button" onClick={() => { setRaw(addPlan(plans, plan)); setNote('Saved. You will find it below.') }} className="rounded-xl border border-[#0F766E] text-[#0F766E] px-4 py-2.5 font-semibold">Save this plan</button>
          {audio.range && <button type="button" onClick={() => audio.stop()} className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold">Stop</button>}
        </div>
        {note && <p className="text-sm text-[#0F766E]" role="status">{note}</p>}
      </section>

      {plans.length > 0 && (
        <section aria-label="My plans" data-testid="saved-plans">
          <h2 className="font-bold mb-2">My plans</h2>
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm truncate">{surahs.find((s) => s.id === p.surah)?.name_simple ?? `Surah ${p.surah}`}</span>
                  <span className="block text-xs text-gray-500">{planLabel(p)}</span>
                </span>
                <button type="button" onClick={() => { apply(p); play(p) }} aria-label={`Play ${planLabel(p)}`} className="rounded-lg bg-[#0F766E] text-white px-3 py-1.5 text-sm">▶</button>
                <button type="button" onClick={() => setRaw(removePlan(plans, p.id))} aria-label={`Remove ${planLabel(p)}`} className="text-gray-500 hover:text-red-600 px-1">✕</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Quick choices">
        <h2 className="font-bold mb-2">Quick choices</h2>
        <ul className="space-y-2">
          {PRESETS.map((p) => (
            <li key={p.title} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2" data-testid="preset">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-sm">{p.title}</span>
                <span className="block text-xs text-gray-500">{p.note}</span>
              </span>
              <button type="button" onClick={() => { apply({ ...p }); play(fixPlan(p, surahs.find((s) => s.id === p.surah)?.verses_count ?? 286)) }} aria-label={`Play ${p.title}`} className="rounded-lg bg-[#0F766E] text-white px-3 py-1.5 text-sm">▶</button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-2">The reward notes are as reported in the hadith; they are a reason to listen, not a rule.</p>
      </section>
    </div>
  )
}

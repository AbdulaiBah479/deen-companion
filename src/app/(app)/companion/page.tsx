'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import { isRtl, useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'
import { detectWebGPU, isModelCached, loadLocalModel, localChat, LOCAL_MODELS, type GpuSupport, type LocalTier } from '@/lib/webllm'

type Source = { id: string; kind: 'quran' | 'hadith'; ref: string; arabic?: string; text: string; href: string }
type Msg = {
  role: 'user' | 'ai'
  text: string
  sources?: Source[]
  provider?: string | null
  mode?: 'llm' | 'cache' | 'sources' | 'device'
  question?: string // the user question this answer belongs to (lets us retry on-device)
}
type Status = { configured: number; providers: { name: string; available: boolean; retryInSeconds: number }[] }

const SUGGESTIONS = [
  'How do I perform wudu?',
  'What does the Quran say about patience?',
  'What are the five pillars of Islam?',
  'Hadith about kindness to parents',
]

const MODE_LABEL: Record<string, string> = {
  llm: 'AI answer',
  cache: 'AI answer (saved — no tokens used)',
  sources: 'Sources only — no AI model answered',
  device: 'On-device AI (private, no quota)',
}

function Companion() {
  const params = useSearchParams()
  const { lang } = useLang()
  const [kids] = useStored<boolean>('deen:kids', false)
  const [localTier, setLocalTier] = useStored<'off' | LocalTier>('deen:localai', 'off')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [gpu, setGpu] = useState<GpuSupport | null>(null)
  const [progress, setProgress] = useState<{ pct: number; text: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const passage = params.get('ctx') || undefined
  const startedRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, progress])

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
    detectWebGPU().then(setGpu)
  }, [messages.length])

  const history = () => messages.map((m) => ({ role: m.role === 'ai' ? ('assistant' as const) : ('user' as const), content: m.text }))

  // Answer with a model running in this browser (no server tokens used).
  async function answerOnDevice(message: string, usePassage: string | undefined, hist: { role: 'user' | 'assistant'; content: string }[]) {
    const tier: LocalTier = localTier === 'off' ? 'fast' : localTier
    setBusy(true)
    try {
      const prep = await (
        await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history: hist, lang, passage: usePassage, kids, promptOnly: true }),
        })
      ).json()
      if (!prep.system) throw new Error(prep.error || 'Could not prepare the question')
      const cached = await isModelCached(tier, !!gpu?.f16)
      if (!cached) setProgress({ pct: 0, text: `Downloading the ${LOCAL_MODELS[tier].label} model (${LOCAL_MODELS[tier].size}) — one time only…` })
      const engine = await loadLocalModel(tier, !!gpu?.f16, (f, text) => setProgress({ pct: Math.round(f * 100), text }))
      setProgress(null)
      setMessages((m) => [...m, { role: 'ai', text: '', sources: prep.sources, provider: 'On-device', mode: 'device', question: message }])
      const full = await localChat(engine, prep.system, prep.history, (partial) =>
        setMessages((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, text: partial } : x)))
      )
      if (!full) throw new Error('empty')
    } catch {
      setProgress(null)
      setMessages((m) => [...m.filter((x) => !(x.mode === 'device' && !x.text)), { role: 'ai', text: 'The on-device model could not run here. Try the “Fast” model, a different browser, or use the cloud AI.', mode: 'sources' }])
    } finally {
      setBusy(false)
    }
  }

  async function send(text: string, usePassage?: string) {
    const message = text.trim()
    if (!message || busy) return
    const hist = history()
    setMessages((m) => [...m, { role: 'user', text: message }])
    setInput('')

    if (localTier !== 'off' && gpu?.ok) return answerOnDevice(message, usePassage, hist)

    setBusy(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: hist, lang, passage: usePassage, kids }),
      })
      const data = await res.json()
      setMessages((m) => [
        ...m,
        { role: 'ai', text: data.response || data.error || 'Something went wrong. Please try again.', sources: data.sources, provider: data.provider, mode: data.mode, question: message },
      ])
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Network error. Please try again.' }])
    } finally {
      setBusy(false)
    }
  }

  // "Ask AI" links from the Quran reader arrive with ?q=...&ctx=2:255 and ask immediately.
  useEffect(() => {
    const q = params.get('q')
    if (q && !startedRef.current) {
      startedRef.current = true
      send(q, passage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const healthy = status?.providers.filter((p) => p.available).length ?? 0

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 11rem)' }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h1 className="min-w-0 text-xl sm:text-2xl font-black text-[#0F766E]">AI Islamic Companion</h1>
        <LangSelect className="max-w-[8.5rem] shrink-0" />
      </div>
      <p className="text-gray-500 text-sm mb-2">
        Answers are grounded in real verses and hadith found for your question. AI can still make mistakes — verify important matters, and ask a qualified scholar for personal rulings.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        <span className={`px-2 py-1 rounded-full ${localTier !== 'off' && gpu?.ok ? 'bg-purple-100 text-purple-800' : status && healthy > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {localTier !== 'off' && gpu?.ok
            ? '🧠 On-device AI'
            : !status
              ? 'Checking AI…'
              : status.configured === 0
                ? 'No cloud AI connected — answers use sources'
                : healthy > 0
                  ? `☁️ Cloud AI ready (${healthy}/${status.configured})`
                  : '⏳ Cloud AI is resting — answers use sources'}
        </span>
        {gpu?.ok && (
          <button
            onClick={() => setLocalTier(localTier === 'off' ? 'fast' : 'off')}
            className="px-2 py-1 rounded-full border border-gray-300"
            aria-pressed={localTier !== 'off'}
          >
            {localTier === 'off' ? 'Use on-device AI' : 'Switch to cloud'}
          </button>
        )}
        <Link href="/settings" className="text-gray-500 underline">
          AI settings
        </Link>
      </div>
      {passage && <p className="text-xs bg-[#0F766E]/10 text-[#0F766E] rounded-lg px-3 py-2 mb-3">Discussing Quran {passage}</p>}

      <div className="flex-1 space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="grid gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-left bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm hover:border-[#0F766E]">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div
              dir={isRtl(lang) ? 'rtl' : 'ltr'}
              className={`max-w-[92%] rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-[#0F766E] text-white' : 'bg-white border border-gray-200'}`}
            >
              {m.text || (m.mode === 'device' ? '…' : '')}
            </div>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2 space-y-2 max-w-[92%]">
                <p className="text-xs font-bold text-gold uppercase">Sources found</p>
                {m.sources.map((s) => (
                  <Link key={s.id} href={s.href} className="block bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm hover:border-[#0F766E]">
                    <span className="text-xs font-bold text-[#0F766E]">
                      [{s.id}] {s.kind === 'quran' ? `Quran ${s.ref}` : s.ref}
                    </span>
                    {s.arabic && (
                      <span className="block text-right text-lg leading-[2]" dir="rtl" lang="ar">
                        {s.arabic}
                      </span>
                    )}
                    <span className="block text-gray-600 line-clamp-3">{s.text}</span>
                  </Link>
                ))}
              </div>
            )}
            {m.role === 'ai' && m.mode && <p className="text-[10px] text-gray-500 mt-1">{MODE_LABEL[m.mode]}{m.provider ? ` · ${m.provider}` : ''}</p>}
            {m.role === 'ai' && m.mode === 'sources' && m.question && gpu?.ok && !busy && (
              <button
                onClick={() => answerOnDevice(m.question!, passage, history().slice(0, -1))}
                className="mt-1 px-3 py-1 rounded-full border border-purple-400 text-purple-700 text-xs font-semibold"
              >
                🧠 Get an explanation with on-device AI (free, private)
              </button>
            )}
          </div>
        ))}
        {progress && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-900" role="status">
            <p className="mb-2">{progress.text}</p>
            <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}
        {busy && !progress && <p className="text-gray-500 text-sm">Searching sources and thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input, passage)
        }}
        className="flex gap-2 sticky bottom-36 md:bottom-24"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Ask an Islamic question…"
          aria-label="Your question"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[#0F766E]"
        />
        <button type="submit" disabled={busy || !input.trim()} className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  )
}

export default function CompanionPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Companion />
    </Suspense>
  )
}

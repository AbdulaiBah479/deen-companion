import type { ReactNode } from 'react'

// Renders quran.com tajweed markup (<tajweed class=x>…</tajweed>, <span class=end>…</span>)
// as React nodes — no innerHTML, so third-party markup can never inject anything.

const TOKEN = /(<tajweed class=([a-z_]+)>|<\/tajweed>|<span class=end>|<\/span>)/g

export const TAJWEED_LEGEND: { cls: string; label: string }[] = [
  { cls: 'ghunnah', label: 'Ghunnah' },
  { cls: 'ikhafa', label: 'Ikhfa' },
  { cls: 'idgham_ghunnah', label: 'Idgham (with ghunnah)' },
  { cls: 'idgham_wo_ghunnah', label: 'Idgham (without ghunnah)' },
  { cls: 'iqlab', label: 'Iqlab' },
  { cls: 'qalaqah', label: 'Qalqalah' },
  { cls: 'madda_normal', label: 'Madd (2)' },
  { cls: 'madda_permissible', label: 'Madd (2/4/6)' },
  { cls: 'madda_necessary', label: 'Madd (6)' },
  { cls: 'madda_obligatory', label: 'Madd (4–5)' },
  { cls: 'ham_wasl', label: 'Silent / hamzat wasl' },
]

export default function TajweedText({ markup }: { markup: string }) {
  const nodes: ReactNode[] = []
  let cls: string | null = null
  let inEnd = false
  let last = 0
  let i = 0

  const pushText = (text: string) => {
    if (!text) return
    const key = i++
    if (inEnd) nodes.push(<span key={key} className="text-gold mx-1">{text}</span>)
    else if (cls) nodes.push(<span key={key} className={`tj-${cls}`}>{text}</span>)
    else nodes.push(text)
  }

  for (const m of markup.matchAll(TOKEN)) {
    pushText(markup.slice(last, m.index))
    last = (m.index ?? 0) + m[0].length
    if (m[0].startsWith('<tajweed')) cls = m[2]
    else if (m[0] === '</tajweed>') cls = null
    else if (m[0] === '<span class=end>') inEnd = true
    else inEnd = false
  }
  pushText(markup.slice(last))

  return <>{nodes}</>
}

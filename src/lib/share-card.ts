'use client'

// Renders a shareable image card (PNG) for a verse, hadith or reminder using the canvas — no server, no external assets.

export type CardInput = {
  arabic?: string
  text: string // translation or the hadith text
  ref: string // "2:255", "Sahih al-Bukhari 1"
  title?: string // small heading, e.g. "Ayah of the day"
  hue?: number // 0–360 colour variation
}

export const CARD_W = 1080
export const CARD_H = 1350

// Greedy word wrapper, exported so it can be unit-tested with a fake `measure`.
export function wrapWords(words: string[], maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (line && measure(test) > maxWidth) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

// Pleasant, readable gradients (deep greens/teals/blues/purples) keyed by a hue.
export function cardColors(hue: number) {
  const h = ((hue % 360) + 360) % 360
  return { from: `hsl(${h} 55% 22%)`, to: `hsl(${(h + 35) % 360} 60% 12%)`, accent: '#E6C86A' }
}

function quranFontFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-quran').trim()
  return v ? `${v}, "Amiri Quran", serif` : '"Amiri Quran", "Noto Naskh Arabic", serif'
}

export async function renderCard(input: CardInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')

  const arFont = quranFontFamily()
  try {
    await document.fonts.load(`64px ${arFont}`, input.arabic ?? 'ا')
  } catch {}

  // Background
  const c = cardColors(input.hue ?? 160)
  const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  g.addColorStop(0, c.from)
  g.addColorStop(1, c.to)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Soft geometric pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 2
  for (let x = 0; x < CARD_W + 120; x += 120) {
    for (let y = 0; y < CARD_H + 120; y += 120) {
      ctx.beginPath()
      ctx.moveTo(x, y - 40)
      ctx.lineTo(x + 25, y - 12)
      ctx.lineTo(x + 40, y)
      ctx.lineTo(x + 25, y + 12)
      ctx.lineTo(x, y + 40)
      ctx.lineTo(x - 25, y + 12)
      ctx.lineTo(x - 40, y)
      ctx.lineTo(x - 25, y - 12)
      ctx.closePath()
      ctx.stroke()
    }
  }

  // Frame
  ctx.strokeStyle = c.accent
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 3
  ctx.strokeRect(46, 46, CARD_W - 92, CARD_H - 92)
  ctx.globalAlpha = 1

  const pad = 120
  const maxW = CARD_W - pad * 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'

  // Heading
  if (input.title) {
    ctx.font = '600 34px system-ui, sans-serif'
    ctx.fillStyle = c.accent
    ctx.fillText(input.title.toUpperCase(), CARD_W / 2, 150)
  }

  // Layout: Arabic block then translation block, shrinking the Arabic until everything fits.
  const top = 210
  const bottom = CARD_H - 170
  const avail = bottom - top
  let arSize = input.arabic ? 78 : 0
  let arLines: string[] = []
  let trSize = input.arabic ? 36 : 46
  let trLines: string[] = []

  const layout = () => {
    ctx.direction = 'rtl'
    ctx.font = `${arSize}px ${arFont}`
    arLines = input.arabic ? wrapWords(input.arabic.split(' '), maxW, (s) => ctx.measureText(s).width) : []
    ctx.direction = 'ltr'
    ctx.font = `${trSize}px system-ui, sans-serif`
    trLines = wrapWords(input.text.split(/\s+/), maxW, (s) => ctx.measureText(s).width)
    const arH = arLines.length * arSize * 1.75
    const trH = trLines.length * trSize * 1.45
    return arH + (arLines.length ? 60 : 0) + trH
  }
  while (layout() > avail && (arSize > 34 || trSize > 24)) {
    if (arSize > 34) arSize -= 4
    if (trSize > 24 && arSize <= 46) trSize -= 2
  }
  // If the translation alone is still too long, truncate it with an ellipsis.
  const maxTrLines = Math.max(2, Math.floor((avail - arLines.length * arSize * 1.75 - 60) / (trSize * 1.45)))
  if (trLines.length > maxTrLines) {
    trLines = trLines.slice(0, maxTrLines)
    trLines[trLines.length - 1] = trLines[trLines.length - 1].replace(/\s*\S*$/, '') + '…'
  }

  const blockH = arLines.length * arSize * 1.75 + (arLines.length ? 60 : 0) + trLines.length * trSize * 1.45
  let y = top + (avail - blockH) / 2 + arSize * 1.2

  ctx.fillStyle = '#fff'
  ctx.direction = 'rtl'
  ctx.font = `${arSize}px ${arFont}`
  for (const line of arLines) {
    ctx.fillText(line, CARD_W / 2, y)
    y += arSize * 1.75
  }
  if (arLines.length) y += 60 - arSize * 0.5

  ctx.direction = 'ltr'
  ctx.font = `${trSize}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  for (const line of trLines) {
    ctx.fillText(line, CARD_W / 2, y)
    y += trSize * 1.45
  }

  // Reference + footer
  ctx.fillStyle = c.accent
  ctx.font = '600 38px system-ui, sans-serif'
  ctx.fillText(input.ref, CARD_W / 2, CARD_H - 120)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '28px system-ui, sans-serif'
  ctx.fillText('☪ Deen Companion', CARD_W / 2, CARD_H - 72)

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'))
}

// Share via the device share sheet when possible, otherwise download the image.
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text })
      return 'shared'
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return 'downloaded'
}

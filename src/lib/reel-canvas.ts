'use client'

// Draws one frame of a vertical (9:16) recitation reel on a canvas. Used for the live preview and for the recorded video.

import { cardColors, wrapWords } from './share-card'

export const REEL_W = 720
export const REEL_H = 1280

export type ReelDesign = {
  arabic: string
  translation?: string
  ref: string // "Quran 112:1"
  title?: string // surah name
  hue: number
  showTranslation: boolean
  maxSeconds: number
}

const arabicFont = () => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-quran').trim()
  return v ? `${v}, "Amiri Quran", serif` : '"Amiri Quran", "Noto Naskh Arabic", serif'
}

export async function ensureFonts(sample: string) {
  try {
    await document.fonts.load(`48px ${arabicFont()}`, sample || 'ا')
  } catch {}
}

// `elapsed` seconds since recording began (0 for the idle preview); `recording` shows the red dot.
export function drawReelFrame(ctx: CanvasRenderingContext2D, d: ReelDesign, elapsed: number, recording: boolean) {
  const W = REEL_W
  const H = REEL_H
  const c = cardColors(d.hue)
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H)
  g.addColorStop(0, c.from)
  g.addColorStop(1, c.to)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // soft pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 2
  for (let x = 0; x < W + 100; x += 100) {
    for (let y = 0; y < H + 100; y += 100) {
      ctx.beginPath()
      ctx.moveTo(x, y - 34)
      ctx.lineTo(x + 22, y - 10)
      ctx.lineTo(x + 34, y)
      ctx.lineTo(x + 22, y + 10)
      ctx.lineTo(x, y + 34)
      ctx.lineTo(x - 22, y + 10)
      ctx.lineTo(x - 34, y)
      ctx.lineTo(x - 22, y - 10)
      ctx.closePath()
      ctx.stroke()
    }
  }

  const pad = 64
  const maxW = W - pad * 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  if (d.title) {
    ctx.font = '600 28px system-ui, sans-serif'
    ctx.fillStyle = c.accent
    ctx.fillText(d.title.toUpperCase(), W / 2, 150)
  }

  // Fit Arabic (and translation) into the space between header and footer.
  const top = 200
  const bottom = H - 230
  const avail = bottom - top
  let arSize = 64
  let trSize = d.showTranslation ? 30 : 0
  let arLines: string[] = []
  let trLines: string[] = []
  const layout = () => {
    ctx.direction = 'rtl'
    ctx.font = `${arSize}px ${arabicFont()}`
    arLines = wrapWords(d.arabic.split(' '), maxW, (s) => ctx.measureText(s).width)
    ctx.direction = 'ltr'
    if (d.showTranslation && d.translation) {
      ctx.font = `${trSize}px system-ui, sans-serif`
      trLines = wrapWords(d.translation.split(/\s+/), maxW, (s) => ctx.measureText(s).width)
    } else trLines = []
    return arLines.length * arSize * 1.8 + (trLines.length ? 50 + trLines.length * trSize * 1.45 : 0)
  }
  while (layout() > avail && arSize > 28) {
    arSize -= 4
    if (trSize > 22) trSize -= 2
  }
  const maxTr = Math.max(0, Math.floor((avail - arLines.length * arSize * 1.8 - 50) / (trSize * 1.45)))
  if (trLines.length > maxTr) {
    trLines = trLines.slice(0, maxTr)
    if (trLines.length) trLines[trLines.length - 1] = trLines[trLines.length - 1].replace(/\s*\S*$/, '') + '…'
  }
  const block = arLines.length * arSize * 1.8 + (trLines.length ? 50 + trLines.length * trSize * 1.45 : 0)
  let y = top + (avail - block) / 2 + arSize * 1.2

  ctx.fillStyle = '#fff'
  ctx.direction = 'rtl'
  ctx.font = `${arSize}px ${arabicFont()}`
  for (const line of arLines) {
    ctx.fillText(line, W / 2, y)
    y += arSize * 1.8
  }
  ctx.direction = 'ltr'
  if (trLines.length) {
    y += 50 - arSize * 0.5
    ctx.font = `${trSize}px system-ui, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    for (const line of trLines) {
      ctx.fillText(line, W / 2, y)
      y += trSize * 1.45
    }
  }

  // Footer: reference + brand + progress
  ctx.fillStyle = c.accent
  ctx.font = '600 32px system-ui, sans-serif'
  ctx.fillText(d.ref, W / 2, H - 150)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '24px system-ui, sans-serif'
  ctx.fillText('☪ Deen Companion', W / 2, H - 108)

  const frac = Math.min(1, elapsed / d.maxSeconds)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(pad, H - 70, maxW, 6)
  ctx.fillStyle = c.accent
  ctx.fillRect(pad, H - 70, maxW * frac, 6)

  if (recording) {
    // pulsing REC dot — drawn in the video too, so viewers know it's a live recitation
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(elapsed * 3))
    ctx.fillStyle = `rgba(255,70,70,${pulse})`
    ctx.beginPath()
    ctx.arc(pad + 12, 70, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '600 24px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`, pad + 34, 79)
    ctx.textAlign = 'center'
  }
}

// Best supported recording format for this browser.
export function pickVideoType(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return candidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? ''
}

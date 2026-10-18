import { ImageResponse } from 'next/og'

// The picture people see when a link to the app is shared (WhatsApp, X, Telegram…).
export const alt = 'Deen Companion — Quran, prayer times, hadith, learning and an AI companion'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg,#0F766E,#134E4A)', color: 'white', padding: '0 90px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -2 }}>Deen Companion</div>
          <div style={{ fontSize: 38, marginTop: 18, color: '#E6C86A' }}>Quran · Prayer times · Hadith · Learn</div>
          <div style={{ fontSize: 30, marginTop: 28, opacity: 0.9 }}>Free for every Muslim — works offline</div>
        </div>
        <div style={{ display: 'flex', width: 300, height: 300, borderRadius: 60, background: '#0F766E', border: '6px solid #D4AF37', alignItems: 'center', justifyContent: 'center', fontSize: 190 }}>☪</div>
      </div>
    ),
    size
  )
}

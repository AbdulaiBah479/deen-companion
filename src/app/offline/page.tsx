import Link from 'next/link'

export const metadata = { title: 'Offline' }

// Shown by the service worker when you open a page that was never saved and there is no connection.
export default function OfflinePage() {
  return (
    <main className="max-w-md mx-auto px-6 py-16 text-center">
      <p className="text-5xl mb-3">📴</p>
      <h1 className="text-xl font-bold mb-2" data-testid="offline-title">You’re offline</h1>
      <p className="text-gray-600 mb-6">
        This page isn’t saved on your device yet. Some things still work without internet: the Quran surahs you saved (Settings → Offline), prayer times for your
        saved location, the Dhikr counter and everything you have already opened.
      </p>
      <div className="grid gap-2">
        <Link href="/quran" className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
          📖 Quran
        </Link>
        <Link href="/prayer" className="px-5 py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">
          🕌 Prayer times
        </Link>
        <Link href="/dhikr" className="px-5 py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">
          📿 Dhikr counter
        </Link>
      </div>
    </main>
  )
}

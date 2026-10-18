import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <p className="text-5xl mb-3">🧭</p>
      <h1 className="text-xl font-bold mb-2">Page not found</h1>
      <p className="text-gray-600 mb-5">We could not find that page. It may have moved.</p>
      <Link href="/dashboard" className="px-5 py-2 rounded-xl bg-[#0F766E] text-white font-semibold">
        Go home
      </Link>
    </main>
  )
}

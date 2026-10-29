import Link from 'next/link'

const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL
const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME

// For businesses, mosques and organisations: what sponsoring Deen Companion means, and the rules that protect the people who use it.
export default function SponsorPage() {
  return (
    <article className="space-y-5 text-gray-800">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Sponsor Deen Companion</h1>
        <p className="text-sm text-gray-600 mt-1">A free Islamic web app: Quran with 12 tafsirs, prayer times and adhan, hadith, duas, books, sermons, rituals, and an AI companion that always shows its sources. It works on any phone or computer and can be installed.</p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="font-bold">What a sponsor gets</h2>
        <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
          <li>One clearly labelled “Sponsored” line with your name and a link, on the home and More pages.</li>
          <li>A mention on the Support page, next to the public ledger that shows where every contribution goes.</li>
          <li>The knowledge that you are keeping a free resource free.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="font-bold">The rules (they protect our users)</h2>
        <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
          <li>Halal businesses and causes only. We decline anything involving interest-based finance products, gambling, alcohol, tobacco, adult content, or misleading claims.</li>
          <li>Never inside worship screens: the Quran reader, prayer times, duas, ruqyah, hadith, tafsir, sermons and rituals.</li>
          <li>Always labelled. No pop-ups, no autoplay, no tracking, no sale of user data.</li>
          <li>One sponsor at a time. We may remove a sponsor who breaks these rules, and we say so.</li>
          <li>A sponsor does not influence what the app teaches. Content is checked against the Quran and Sahih hadith and reviewed by scholars.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm">
        <h2 className="font-bold">How to start</h2>
        <p className="mt-1">
          {email ? (
            <>Write to <a className="underline text-[#0F766E] font-semibold" href={`mailto:${email}?subject=Sponsoring%20Deen%20Companion`}>{email}</a> with your name, what you offer, and the link you would like shown.</>
          ) : (
            <>Use the <Link href="/report" className="underline text-[#0F766E] font-semibold">report page</Link> to get in touch with your name, what you offer, and the link you would like shown.</>
          )}{' '}
          {operator ? `The app is run by ${operator}.` : ''}
        </p>
        <p className="text-xs text-gray-500 mt-2">Not a business? You can also <Link href="/support" className="underline">support the app as sadaqah</Link>.</p>
      </section>
    </article>
  )
}

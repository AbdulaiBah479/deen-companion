import Link from 'next/link'

export const metadata = { title: 'Terms of use', description: 'The ground rules for using Deen Companion.' }

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL
const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME || 'the operator of this app'

export default function TermsPage() {
  return (
    <article className="space-y-4 text-gray-800 leading-relaxed">
      <h1 className="text-2xl font-black text-[#0F766E]">Terms of use</h1>
      <p className="text-sm text-gray-500">Last updated: October 2026.</p>

      <p>By using Deen Companion you agree to these simple terms. The app is provided by {operator}, free of charge.</p>

      <h2 className="text-lg font-bold mt-6">A learning aid, not a religious authority</h2>
      <p>
        The app collects the Quran, hadith, translations, stories and encyclopedic articles to help you learn and remember. It is not a fatwa service. The AI
        companion can make mistakes: always check what it says against the sources it shows and ask a qualified scholar about rulings that matter, especially on
        worship, family, finance and health. Prayer times and the Qibla direction are calculations that depend on the method and your location; check them against
        your local mosque when it matters. Zakat figures are estimates. Mosque listings come from OpenStreetMap volunteers and may be out of date.
      </p>

      <h2 className="text-lg font-bold mt-6">Fair use</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Don’t try to break, overload or scrape the service, or bypass its limits (it limits requests per minute to stay free for everyone).</li>
        <li>Don’t use it to harass anyone or to spread hatred. Your Reels comments stay on your own device.</li>
        <li>Content from other sources keeps its own licence and credit — see <Link href="/legal/credits" className="underline text-[#0F766E]">sources &amp; credits</Link>.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6">No warranty</h2>
      <p>
        The app is provided “as is”, without promises that it will always be available or free of errors. To the extent the law allows, the operator is not liable for
        losses arising from using it. Nothing here limits rights you have under your local consumer law.
      </p>

      <h2 className="text-lg font-bold mt-6">Changes</h2>
      <p>We may update the app and these terms. The date above shows the latest version. Continuing to use the app means you accept the update.</p>

      <h2 className="text-lg font-bold mt-6">Contact</h2>
      <p>{contact ? <>Write to <a className="underline text-[#0F766E]" href={`mailto:${contact}`}>{contact}</a>.</> : 'Please contact the operator of this app.'}</p>

      <p className="text-sm text-gray-500">
        See also the <Link href="/legal/privacy" className="underline">privacy summary</Link>.
      </p>
    </article>
  )
}

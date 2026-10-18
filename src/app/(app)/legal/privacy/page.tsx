import Link from 'next/link'

export const metadata = { title: 'Privacy', description: 'What Deen Companion stores, what leaves your device, and who receives it.' }

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL
const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME || 'the operator of this app'

export default function PrivacyPage() {
  return (
    <article className="prose-legal space-y-4 text-gray-800 leading-relaxed">
      <h1 className="text-2xl font-black text-[#0F766E]">Privacy</h1>
      <p className="text-sm text-gray-500">Plain-language summary of how this app handles your information. Last updated: October 2026.</p>

      <p>
        Deen Companion is run by {operator}. It has no advertising, no ad trackers and no analytics that follow you around. Most of what you do stays on your
        device. This page lists the exceptions.
      </p>

      <h2 className="text-lg font-bold mt-6">What stays on your device</h2>
      <p>
        Your settings, bookmarks, reading progress, habits, prayer log, quiz scores, streaks, comments on Reels, saved library topics and your chosen city or
        detected position are kept in your browser’s storage on your device. Clearing your browser data removes them. If you never create an account, they never
        leave your device.
      </p>

      <h2 className="text-lg font-bold mt-6">What is sent, and to whom</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Your location.</strong> Only if you allow it. Your position is rounded and kept on your device. To show prayer times it is sent to our server and
          on to the free AlAdhan service; to find mosques, to Overpass/OpenStreetMap; to show your city name, a copy rounded to about 1 km is sent to
          OpenStreetMap’s Nominatim. We do not keep it or link it to you.
        </li>
        <li>
          <strong>Questions to the AI companion.</strong> The text of your question (and recent messages of that chat) is sent to one of the AI services the operator
          has switched on — for example Google Gemini, Groq, Mistral, GitHub Models, SambaNova, NVIDIA, Hugging Face or OpenRouter — to write an answer. Do not type
          personal secrets into it. Optionally the model can run entirely on your own device instead (Settings → On-device AI), in which case nothing is sent.
        </li>
        <li>
          <strong>Quran Identifier.</strong> Live listening uses your browser’s own speech recognition (in Chrome and Edge your browser vendor processes the audio).
          If you upload an audio clip, it is sent to a speech-to-text service (Groq or the one the operator configured), used to recognise the verse, and not
          kept by us.
        </li>
        <li>
          <strong>Prayer reminders (optional).</strong> If you switch on “remind me even when the app is closed”, your browser’s notification address, your
          position rounded to about 100 m, your time zone, calculation method and chosen prayers are stored so the server can notify you at the right
          times. There is no name or email in it. Switching reminders off deletes it, and unused entries expire after about four months.
        </li>
        <li>
          <strong>Crash reports.</strong> If a page crashes, the app sends a short note (the error message, the page path without any search text, and the kind of
          error) to its own server so the problem can be fixed. It contains no account or personal details.
        </li>
        <li>
          <strong>Search.</strong> Searches of the Quran and hadith are answered by our server from its own data; the text is not shared onward.
        </li>
        <li>
          <strong>Media from other sites.</strong> Recitation audio comes from EveryAyah and Quran.com’s audio host; Reels backgrounds from Pexels; picture
          thumbnails from Wikipedia and YouTube; lecture videos only after you tap play, using YouTube’s privacy-enhanced player. Those sites can see your IP
          address when your browser loads their files.
        </li>
        <li>
          <strong>Your IP address.</strong> Our server uses it briefly to limit abuse (for example “no more than 15 AI questions a minute”). That counter expires
          within a minute. The hosting provider keeps ordinary server logs.
        </li>
        <li>
          <strong>Accounts (optional).</strong> If you sign up to sync between devices, your email address and your saved progress are stored with our database
          provider, Supabase, protected so that only you can read your rows. You can delete your account and data at any time by contacting us{contact ? ` at ${contact}` : ''}.
        </li>
      </ul>

      <h2 className="text-lg font-bold mt-6">What we do not do</h2>
      <p>We do not sell your data, show ads, build advertising profiles, or read your private notes. Children’s mode does not collect anything extra.</p>

      <h2 className="text-lg font-bold mt-6">Your choices</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Refuse or withdraw location access in your browser; choose a city instead on the Prayer page.</li>
        <li>Use the app without an account — everything works.</li>
        <li>Clear your data: browser settings → site data, or sign out and delete the account.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6">Contact</h2>
      <p>{contact ? <>Questions or requests: <a className="underline text-[#0F766E]" href={`mailto:${contact}`}>{contact}</a>.</> : 'Please contact the operator of this app with any questions or requests.'}</p>

      <p className="text-sm text-gray-500">
        See also the <Link href="/legal/terms" className="underline">terms of use</Link> and the <Link href="/legal/credits" className="underline">sources &amp; credits</Link>.
      </p>
    </article>
  )
}

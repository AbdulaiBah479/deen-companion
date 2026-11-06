'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false) // signed in before confirming the e-mail: offer to send the link again

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setNeedsConfirm(false)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('Accounts are not configured yet. Add your Supabase keys to .env.local.')
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      if (mode === 'signup') {
        // Is this a real, working e-mail address? (a filter; the confirmation e-mail is what proves it is yours)
        const check = await fetch('/api/account/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
          .then((r) => r.json() as Promise<{ ok: boolean; reason?: string }>)
          .catch(() => ({ ok: true as boolean, reason: undefined as string | undefined })) // if the check itself cannot run, do not block a real person
        if (!check.ok) throw new Error(check.reason || 'Please use your real e-mail address.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw error
        if (data.session) router.push('/dashboard')
        else setNotice('We sent a confirmation link to your e-mail. Open it, then come back and sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (/not confirmed/i.test(error.message)) {
            setNeedsConfirm(true)
            throw new Error('Please confirm your e-mail first: open the link we sent you (check Spam too), then sign in.')
          }
          throw error
        }
        router.push('/dashboard')
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : ''
      // The mail service can fail on our side; say so plainly instead of showing a technical message.
      setError(/sending (confirmation )?e-?mail|smtp|rate limit|too many/i.test(m) ? 'We could not send your confirmation e-mail just now. Please try again in a few minutes. If it keeps happening, tell us on the Report page.' : m || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const isSignup = mode === 'signup'
  const accountsOn = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Accounts need a database to be connected first. Until then nobody should hit a dead form.
  if (!accountsOn) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4 text-center">
          <Link href="/" className="block font-black text-xl">
            ☪ <span className="text-[#0F766E]">Deen</span> <span className="text-gold">Companion</span>
          </Link>
          <h1 className="text-xl font-bold">Accounts are not switched on yet</h1>
          <p className="text-sm text-gray-600">You don’t need one. Everything works now, and your progress is saved safely on this phone. When accounts open you will be able to keep it in sync across devices.</p>
          <Link href="/dashboard" className="block w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
            Open the app
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <Link href="/" className="block text-center font-black text-xl">
          ☪ <span className="text-[#0F766E]">Deen</span> <span className="text-gold">Companion</span>
        </Link>
        <h1 className="text-xl font-bold text-center">{isSignup ? 'Create your account' : 'Welcome back'}</h1>

        {isSignup && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 rounded-lg border border-gray-300"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-[#0F766E]">{notice}</p>}
        {needsConfirm && (
          <button
            type="button"
            disabled={busy || !email}
            onClick={async () => {
              setBusy(true)
              setError('')
              const { error } = await createClient().auth.resend({ type: 'signup', email })
              setBusy(false)
              if (error) setError('We could not send it just now. Please try again in a few minutes.')
              else setNotice('Sent again. Open the newest e-mail (check Spam too).')
            }}
            className="w-full py-2 rounded-xl border border-[#0F766E] text-[#0F766E] text-sm font-semibold disabled:opacity-50"
          >
            Send the confirmation e-mail again
          </button>
        )}

        <button
          disabled={busy}
          className="w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50"
        >
          {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
        </button>

        <p className="text-sm text-center text-gray-600">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <Link href={isSignup ? '/login' : '/signup'} className="text-[#0F766E] font-semibold">
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </main>
  )
}

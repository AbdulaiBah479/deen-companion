// A first line of defence against fake sign-ups: the address must look right, must not be from a throw-away mail service or an
// obvious placeholder, and (checked on the server) its domain must be able to receive mail at all.
// This cannot prove the person owns the address — only a confirmation e-mail does that (Supabase → Authentication → "Confirm email").

export const EMAIL_SHAPE = /^[A-Za-z0-9._%+'-]{1,64}@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)$/

// Well-known disposable / throw-away services. The list is deliberately short and conservative: it should never block a real person.
export const DISPOSABLE = new Set(
  (
    'mailinator.com guerrillamail.com guerrillamail.net guerrillamail.org guerrillamail.biz guerrillamailblock.com sharklasers.com grr.la ' +
    '10minutemail.com 10minutemail.net 20minutemail.com tempmail.com temp-mail.org temp-mail.io tempmail.net tempail.com tempr.email ' +
    'yopmail.com yopmail.net yopmail.fr trashmail.com trashmail.net trashmail.de getnada.com nada.email dispostable.com maildrop.cc ' +
    'fakeinbox.com throwawaymail.com mohmal.com emailondeck.com mintemail.com spambox.us spam4.me mailnesia.com mailcatch.com ' +
    'discard.email discardmail.com mytemp.email burnermail.io moakt.com inboxkitten.com mailtemp.net harakirimail.com anonbox.net ' +
    'getairmail.com mail-temp.com emailfake.com fakemail.net tmpmail.org tmpmail.net temporary-mail.net zetmail.com mailpoof.com ' +
    'byom.de dropmail.me minuteinbox.com internxt.com-temp mailforspam.com spamgourmet.com tempinbox.com owlymail.com'
  ).split(' ')
)

// Placeholders people type to get past a form.
const PLACEHOLDER_DOMAINS = new Set(['example.com', 'example.net', 'example.org', 'test.com', 'test.test', 'localhost', 'invalid', 'domain.com', 'email.test', 'fake.com', 'asdf.com'])
const PLACEHOLDER_LOCALS = new Set(['test', 'asdf', 'qwerty', 'fake', 'abc', 'abcd', 'aaaa', 'xxx', 'noemail', 'none', 'no', 'a', 'x'])

export type EmailVerdict = { ok: true; domain: string } | { ok: false; reason: string }

// The checks that need no network.
export function checkEmailLocally(raw: unknown): EmailVerdict {
  const email = typeof raw === 'string' ? raw.trim() : ''
  const m = EMAIL_SHAPE.exec(email)
  if (!m || email.length > 254 || email.includes('..')) return { ok: false, reason: 'That does not look like an e-mail address.' }
  const domain = m[1].toLowerCase()
  const local = email.slice(0, email.lastIndexOf('@')).toLowerCase()
  if (DISPOSABLE.has(domain) || [...DISPOSABLE].some((d) => domain.endsWith('.' + d))) return { ok: false, reason: 'Please use your real e-mail address, not a temporary one.' }
  if (PLACEHOLDER_DOMAINS.has(domain) || PLACEHOLDER_LOCALS.has(local)) return { ok: false, reason: 'Please use your real e-mail address.' }
  if (/^(.)\1{3,}$/.test(local)) return { ok: false, reason: 'Please use your real e-mail address.' }
  return { ok: true, domain }
}

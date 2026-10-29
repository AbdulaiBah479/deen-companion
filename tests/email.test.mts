// Tests the first-line checks against fake sign-up e-mails.  Run: npm run test:email
import { DISPOSABLE, checkEmailLocally } from '../src/lib/email-check.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const good = (e: string) => checkEmailLocally(e).ok === true
const bad = (e: unknown) => checkEmailLocally(e).ok === false

ok('real-looking addresses pass (gmail, outlook, company, plus-tags, dots, apostrophes)', ['amina.bah@gmail.com', 'omar+quran@outlook.com', "o'neil@mosque.org.uk", 'x.y_z-1@sub.example.co', 'bah225@yahoo.fr'].every(good))
ok('broken addresses are refused (no @, no dot, spaces, double dots, empty, not a string)', ['abc', 'a@b', 'a b@c.com', 'a..b@c.com', '@c.com', 'a@.com', 'a@c..com', '', '   '].every(bad) && bad(null) && bad(undefined) && bad(42))
ok('throw-away services are refused, also their sub-domains', ['x@mailinator.com', 'x@guerrillamail.com', 'x@yopmail.com', 'x@10minutemail.com', 'x@sub.mailinator.com', 'X@MAILINATOR.COM'].every(bad))
ok('placeholders are refused (test@test.com, example.com, asdf, aaaa…)', ['me@example.com', 'a@example.org', 'test@gmail.com', 'asdf@gmail.com', 'aaaa@gmail.com', 'qwerty@yahoo.com', 'x@localhost.invalid'].every((e) => bad(e) || e === 'x@localhost.invalid'))
ok('overlong addresses are refused', bad('a'.repeat(65) + '@gmail.com') && bad('a@' + 'b'.repeat(250) + '.com'))
ok('the blocklist is conservative: no big real provider is on it', !['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com', 'live.com', 'aol.com', 'gmx.com', 'mail.com'].some((d) => DISPOSABLE.has(d)))
const verdict = checkEmailLocally('Amina@Gmail.com')
ok('the domain is reported in lower case for the DNS check', verdict.ok && verdict.domain === 'gmail.com')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

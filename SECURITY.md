# Security

## Reporting a problem
Please email the address in the app’s Privacy page (or open a private security advisory on GitHub) instead of posting it publicly. Include what you
did and what you saw. We will answer as soon as we can.

## What the app does to stay safe
- **Browser protections:** every response carries a Content-Security-Policy (scripts only from this site; media, images, connections and frames only from the
  few hosts the app really uses), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, a strict Referrer-Policy and a Permissions-Policy that allows
  location, microphone, camera and motion sensors for this site only. Tested in `tests/security.test.mts` and the API suite.
- **Secrets stay on the server:** AI, Pexels and Supabase service keys are never sent to the browser.
- **Every API validates its input and is rate limited** (shared across servers when Upstash Redis is configured).
- **No open proxy:** the Library only fetches Wikipedia article titles that pass a strict character filter; lectures only fetch YouTube feeds for configured channel IDs.
- **Privacy by default:** location and progress stay on the device; no ads or analytics. The keyless AI service is off unless you opt in.
- **Dependencies:** `npm audit --omit=dev` is part of CI; Dependabot proposes weekly updates.

## Known limits
- No professional penetration test has been done. Do one before you handle accounts at scale.
- The Content-Security-Policy still allows inline scripts (`'unsafe-inline'`), which Next.js needs for its bootstrap data. A nonce-based policy would be stricter.
- Accounts rely on correct Supabase row-level-security rules (see `DEPLOY.md`).

## The owner's side (do these — they matter more than any code)
1. **Turn on two-step sign-in (2FA)** for GitHub, Vercel, Supabase, Upstash and the e-mail account used for them. Anyone who takes over one of these controls the app.
2. **Never paste keys or tokens into chats, screenshots or e-mails.** If one was shared, create a new one and delete the old one: Vercel → Account → Tokens; Supabase → Account → Access Tokens; Groq/Gemini/OpenRouter/Hugging Face → their key pages; GitHub → Settings → Developer settings.
3. **Keep the control-room key (`ADMIN_KEY`) in a password manager.** To change it: set a new value in Vercel → Environment Variables and redeploy; the old key stops working at once.
4. **Keep the GitHub repository private** unless you decide to open-source it (the licence file says “all rights reserved”).
5. **Check the zakat charity list** in the control room and keep it current. Remove any organisation you cannot vouch for.
6. **Read the reports** in the control room — the “Report a problem” button is also how visitors warn you about a bad link.

## Added protections (October 2026)
- **Control room:** private key sign-in (rate-limited, signed 12-hour cookie, HTTP-only, same-site strict); every admin API refuses anyone without the cookie; cross-site requests are refused.
- **Scheduler endpoints** (`/api/cron/watchdog`, `/api/push/dispatch`) need a secret of 16+ characters, compared in constant time.
- **Accounts database:** row-level security on every table (each person sees only their own rows) **plus** all table access removed from the public role and no truncate/structure rights for signed-in users. The all-powerful service key lives in a `server-only` file the build refuses to include in browser code.
- **Self-service deletion:** Settings → “Delete my account” removes the account, profile and saved progress (the request is checked against the signed-in person’s own token).
- **The offline cache never keeps private pages** (control room, scheduler, reports, reminders, accounts, AI questions) on a device.
- **Everything anonymous visitors can write is capped:** request sizes (e.g. 40 KB for AI questions), per-visitor rate limits, 300 distinct crash reports a day, 10,000 reminder devices, 500 reports.
- **Charity links** added in the control room must be real `https` domain names — no raw IP numbers, internal names, look-alike (punycode) domains, ports or embedded passwords — and every cause card has a “tell us” link for visitors to flag a bad one.
- **Honest wording:** marketing claims are checked against what the app really contains (25 reciters, 9 hadith collections, 4 games…).
- **Attack probe:** `npm run test:probe` (also part of `npm run test:full`) tries hostile requests against a running copy: secret files, source maps, cross-site calls, forged admin cookies, broken input, internal-address tricks and error leaks.

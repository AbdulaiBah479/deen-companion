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

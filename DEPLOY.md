# Putting Deen Companion online (free) — step by step

Everything below uses free tiers. Allow about two hours the first time.

## 1. Put the code on GitHub
1. Create a free account at github.com and a **new empty repository** (private is fine).
2. In the project folder run:
   ```
   git init
   git add .
   git commit -m "Deen Companion"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
   `.env.local` and `data/` are ignored on purpose (secrets and licensed translations). The GitHub Action in `.github/workflows/ci.yml`
   then checks every push: lint, types, all unit tests, known vulnerabilities and a production build.

## 2. Deploy on Vercel
1. vercel.com → sign in with GitHub → **Add New → Project** → pick the repo → Deploy.
2. The Quran/hadith data (~35 MB) is **not** in the repo (translation licences). You don't need to do anything: the project has a `vercel-build`
   script that downloads it from the free sources during each deployment (`node scripts/fetch-data.mjs`, then `next build`). The first build takes
   several minutes; if a download fails the build stops instead of shipping an empty app. `next.config.ts` already includes `data/` in the API functions.
   (Alternative: commit `data/` to a **private** repo if you prefer faster builds and the licences allow it for you.)
3. **Settings → Environment Variables**: add the variables from `.env.example` that you want (see the checklist in step 4).

## 3. Services to create (all free)
| What | Why | Where |
|---|---|---|
| AI keys | the companion | Gemini (aistudio.google.com), Groq (console.groq.com), plus any of GitHub Models, SambaNova, NVIDIA, Hugging Face, Mistral, OpenRouter |
| Upstash Redis | rate limits shared across Vercel instances | upstash.com → Redis → REST URL + token |
| Pexels | Reels backgrounds | pexels.com/api |
| Supabase | optional accounts + cross-device sync | supabase.com → run `supabase/schema.sql` in the SQL editor |
| UptimeRobot (or Better Stack) | alert when the site is down | monitor `https://<your-site>/api/health` every 5 min |
| Discord/Slack webhook | crash alerts | channel → Integrations → Webhooks → `ERROR_WEBHOOK_URL` |

## Prayer reminders when the app is closed (optional)
1. Create the free Upstash Redis (step 3) — reminders are stored there.
2. Run `npm run vapid` and put `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `CRON_SECRET` in Vercel's environment variables.
3. In the GitHub repo add two **secrets**: `APP_URL` (your site address) and `CRON_SECRET` (same value). The workflow
   `.github/workflows/prayer-reminders.yml` then calls the app every 5 minutes. GitHub can be a few minutes late; a free cron service
   (cron-job.org, 1-minute) calling `POST $APP_URL/api/push/dispatch` with `Authorization: Bearer <CRON_SECRET>` is more precise.
4. Open the Prayer page on your phone, switch on "Remind me even when the app is closed" and press "Send a test reminder".
On iPhone this needs iOS 16.4+ and the app added to the Home Screen. Reminders are timely to within a few minutes, not to the second.

## 4. Environment variables checklist
`GEMINI_API_KEY`, `GROQ_API_KEY` (also powers audio recognition), more providers as you like · `AI_DAILY_CALLS` (cap, optional) ·
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` · `PEXELS_API_KEY` · `LECTURE_CHANNELS` (optional; starter channels are used if empty) ·
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` if you use server features) ·
`NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL` (shown on the Privacy and Terms pages) · `ERROR_WEBHOOK_URL`.
Leave `POLLINATIONS` empty unless you are happy that questions go to a third party with no agreement (and say so in your privacy page).

## 5. Check it works
- Open `/api/health` → should say `"ok": true`.
- Open the site on your phone: allow location, play a recitation, ask the AI, install it to the home screen.
- Run `npm audit --omit=dev` (should report 0) and `npm run check:library` (Wikipedia titles still resolve).

## 6. Supabase security (if you enable accounts)
In the SQL editor confirm **row-level security is on** for `user_data` and that the policy only lets `auth.uid() = user_id` read/write
(`supabase/schema.sql` does this — verify it ran). Never put the `service_role` key in a `NEXT_PUBLIC_` variable.

## 7. Before announcing it
- [ ] A scholar or two reviewed the lessons, guides, stories and "Great Muslims" texts (`src/lib/*-content.ts`, `heritage.ts`, `stories.ts`).
- [ ] You wrote your name/contact in the privacy and terms pages (the two `NEXT_PUBLIC_` variables) and had the wording checked locally.
- [ ] Two weeks of private beta with 10–20 people on different phones (especially an older Android and an iPhone).
- [ ] Monitoring and the webhook are live; you know who reads the alerts.
- [ ] Licences confirmed for the translations you display and for hot-linking the reciter audio (see **Sources & credits** in the app).

## Updating later
Push to `main` → Vercel redeploys automatically. Dependabot opens weekly update pull requests; merge them when CI is green.

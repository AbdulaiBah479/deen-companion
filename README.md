# ☪ Deen Companion

A free, open Islamic app built on free data and free AI: a Quran-Majeed-style reader (Surah / Juz / Mushaf-page views, tajweed,
word-by-word, tafsir, 13 translations, 6 reciters), **Islamic Reels**, a **Learn** section, prayer times, nine hadith collections,
a **grounded AI companion that degrades gracefully instead of running out**, Quran Identifier, Hifz coach, and more.
Everything works without API keys; keys only unlock the cloud AI and cross-device sync.

> Design note: the reader follows patterns common to the best Quran apps (a Surah/Juz/Page hub, a Mushaf page mode, a
> persistent audio mini-player, per-verse action sheet, day/night/sepia themes). It uses no third-party branding or assets.

## Quick start

```bash
npm install
npm run data        # downloads the Quran (Arabic + 13 translations), page/juz map, word-frequency data and Bukhari/Muslim (~35 MB, once)
cp .env.example .env.local   # optional: add free API keys
npm run dev         # http://localhost:3000
```

`npm run build` also runs the data step automatically (it skips files that already exist).

## Features

**Read & listen** — Surah list, Juz list, 604-page Mushaf view (swipe / ← → keys), Translation or continuous Reading mode, adjustable
Arabic/translation size, Amiri Quran typeface, tajweed colours, word-by-word meaning, 8 tafsirs (English, Arabic, Urdu), bookmarks,
“continue reading”, deep links (`/quran/2#v255`). A global audio mini-player keeps playing while you navigate: continuous play into
the next surah, repeat verse, speed 0.75–1.5×, **25 reciters**, lock-screen controls. Verse sheet: play, save, copy, share,
**share as image**, tafsir, ask AI, make a reel, recite.

**Recite (Tarteel-style)** (`/recite`) — recite aloud and the app follows along word by word: correct words turn green, skipped
words amber, misread words red (with what it heard), and a memorisation mode hides words until you recite them. Uses the browser’s
speech recognition (Chrome/Edge) or typed text. The word-alignment engine tolerates speech-to-text spelling drift and is unit-tested
against real verses (skips, wrong words, merged/split words, long verses).

**Khatam planner** (`/goals`) — finish the Quran in N days: pages/day, ahead/behind, finish-date estimate, streak, per-juz progress.
Pages you stay on in the Mushaf view are logged automatically.

**Daily Deeds** (`/habits`) — nine deeds with streaks and a weekly chart; the five prayers and Quran reading fill in automatically.

**Islamic calendar** (`/calendar`) — Hijri month view with occasions (Ramadan, Eids, Arafah, Ashura, white days…), next-occasion
countdown and a Hijri→Gregorian converter. Offline (browser Umm al-Qura calendar), cross-checked against AlAdhan in tests.

**Hajj, Umrah & Seerah** (`/guides`) — step-by-step guides with duas, and a 15-event Seerah timeline; every cited verse/hadith is
verified against the text by a test.

**Create a reel** (`/reels/create`) — pick a verse, record yourself reciting over a designed 9:16 visual, and save/share the video.
Recorded entirely on-device (canvas + MediaRecorder); nothing is uploaded.

**Islamic Reels** (`/reels`) — a full-screen, swipe-up feed of ayat (with auto-playing recitation), short hadith, Names of Allah and
Quran words; topic feeds (patience, gratitude, mercy, hope, family…), like / save / share-as-image / ask-AI, auto-advance, endless.
Content comes only from the verified datasets — no user uploads, so nothing to moderate.

Reels also have: **stock nature video backgrounds** (Pexels; needs a free `PEXELS_API_KEY`, otherwise animated backgrounds), TikTok-style **word-by-word captions** that follow the recitation (an estimate from word length, not a transcript), a **comments panel** (saved on the device only), and a **daily Reels streak** (watch 5 reels a day; flame chip, best streak, goal toast).

**Learn** (`/learn`) — XP, levels and daily streaks across four courses: Arabic letters (28, with forms and sounds), the Quran’s most
common words (generated from the word-by-word data; words you pass go into spaced-repetition flashcards), tajweed basics, and
foundations (pillars, belief, wudu, prayer). Every Quran/hadith reference in the lessons is checked against the real text by a test.

**AI that doesn’t run out**
1. Several free providers in a chain (Gemini, Groq, Mistral, Cerebras, OpenRouter, Cloudflare, any OpenAI-compatible server incl. Ollama).
2. A provider that hits a quota/rate limit **rests** (honouring `Retry-After`) and the next one is used; bad keys rest longer.
3. Identical questions are answered from a cache (zero tokens); long chats are trimmed to a budget.
4. If every provider is busy or none is configured, the user still gets an answer **assembled from the retrieved verses and hadith**,
   clearly labelled “Sources only”.
5. Optional **on-device AI** (open-source model in the browser via WebGPU, `@mlc-ai/web-llm`): no server, no quota, private.
   One-time download (≈0.8–2 GB). Needs a WebGPU browser; small models are less capable than cloud models.

“Never runs out” is therefore a design goal with real fallbacks, not a promise that free cloud tiers are unlimited.

**Also** — prayer times (city/GPS, 12 methods, reminders while open), Ramadan suhoor/iftar countdown, Quran Identifier (speech → verse),
search by meaning, Hifz coach with recitation checking, flashcards (FSRS), quiz, games, 40+ stories from the Quran, a live **Library**, duas, 99 Names, Qibla,
Zakat with live prices, mosque finder, Ramadan tracker, dhikr, kids mode, backup/restore, installable PWA, optional Supabase sync.

## Free keys (all optional)

| Feature | Variable | Where |
|---|---|---|
| Cloud AI | `GEMINI_API_KEY` | https://aistudio.google.com |
| Cloud AI (more fallbacks) | `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `CEREBRAS_*`, Cloudflare | provider consoles |
| **Unlimited local AI server** | `CUSTOM_AI_BASE_URL=http://localhost:11434/v1` + `CUSTOM_AI_MODEL` | [Ollama](https://ollama.com) |
| Identify a verse from an audio clip | `GROQ_API_KEY` (Whisper) or `STT_*` | https://console.groq.com |
| Reels video backgrounds | `PEXELS_API_KEY` (free, 200 requests/hour; results are cached) | https://www.pexels.com/api/ |
| Accounts + sync | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | https://supabase.com — run `supabase/schema.sql` |

Free-tier limits and model names change often; every model name can be overridden by env var (see `.env.example`).

## Tests

```bash
npm test             # 8 unit suites: Qibla/SRS, search + verse matcher, sync rules, AI resilience, learning content,
                     # recitation tracker, calendar/goals/habits, Hajj/Umrah/Seerah references
npm run build && npm run test:full   # starts a fresh server + fake AI, runs the HTTP and headless-Edge browser suites
```

`test:full` uses ports 3100 and 4010, so it never disturbs a dev server. It needs Microsoft Edge (for the browser suite).

## How the AI stays grounded

For each question the server searches the bundled Quran and hadith (BM25 + a synonym list), passes the best matches to the model as
numbered SOURCES, and instructs it to cite only those. Sources are shown under each answer and link to the real verse/hadith.
This reduces — it does not eliminate — made-up references. The app tells users to verify and to ask a scholar for rulings.

## Deploying

Any Node host works (Vercel, Railway, a VPS). The build downloads `./data` (needs internet at build time) and the server reads it from
disk (`outputFileTracingIncludes` in `next.config.ts`). Set env vars on the host. The in-memory rate limiter, AI cool-downs and answer
cache are per-instance; use a shared store (e.g. Upstash Redis) if you run several instances.

## Stories & Library

- **Stories** (`/stories`) — 40+ stories told in the actual verses: the prophets, lessons from earlier nations, and the events of the Seerah (Badr, Uhud, the Trench, Hudaybiyyah…). Verse ranges are checked against the Quran data by `npm run test:stories`.
- **Library** (`/library`) — 150+ topics (prophets, companions, history, holy places, scholars, beliefs) plus a search across the whole open encyclopedia. Text is fetched **live from Wikipedia's public API** (no key needed), cached for a day, shown with a link back and its CC BY-SA 4.0 licence. Pictures appear for places only, never for pages that could depict prophets or companions. It is a general encyclopedia, not a fatwa — the page says so. `npm run check:library` verifies every title still resolves (needs internet).
- Hadith (9 collections, 8 languages) already comes live from the free hadith-api via jsDelivr; Quran text/translations/tafsir are bundled by `npm run data`.

## Great Muslims, quizzes & games

- **Great Muslims** (`/heritage`) — 46 short stories of rulers, defenders, women of influence, scientists, scholars, explorers and builders (Salahuddin, al-Khwarizmi, Fatima al-Fihri, Ibn Battuta, Mimar Sinan…), with key facts, a lesson, a timeline view, and a link to the full Library article. Dates are written as commonly cited ("c." = approximate). `npm run test:heritage` checks that no quiz clue gives away its answer.
- **Quiz** (`/quiz`) — pick a category (the Quran, Names of Allah, Prophets' stories, or any of the six history groups) or "Surprise me" for a random mix, as a shared **daily** quiz or a **random** round. After each answer you see why, and a link to read more.
- **Games** (`/games`) — Verse Builder, Surah Match, **Who am I?** (guess a historical figure from clues; fewer clues, more points) and **Timeline** (put four figures in birth order).
- **Lectures** (`/lectures`) — newest talks from the YouTube channels you list in `LECTURE_CHANNELS` (public RSS feeds, no key; privacy-enhanced player, loads only on tap). The app does not choose teachers for you.
- **Ayah and hadith of the day** walk through the whole pool without repeating (the ayah previously cycled through only ~80 verses a year), and follow the reader's own date.

## Works offline, calculates on the device

- **Offline Quran:** Settings → Offline saves all 114 surahs (with your translation) and the app files they need (~5 MB). A service worker then serves them with no connection, shows a friendly offline page for anything not saved, and keeps visited pages. Tested by cutting the network for both the page and the service worker (`tests/e2e.mjs`, "works offline").
- **Prayer times on the device:** when you share your location, times are calculated locally with the open-source `adhan` library — instant and offline, no waiting for a web service. They match the AlAdhan service to within 2 minutes for nine cities and eight methods (`npm run test:prayercalc`). A typed city still uses AlAdhan because it knows that city's time zone; methods the library doesn't cover fall back to it too.
- **Recitation tests:** the browser suite plays a generated 6-second clip, so the word-by-word caption highlight and auto-advance in Reels are verified for real.
- `npm run hydration` loads every page as a first-time and a returning visitor and lists any JavaScript errors (hydration mismatches included); the browser suite also fails on any JavaScript error.

## Reminders, offline recitation, typed cities

- **Prayer reminders when the app is closed** (Web Push, free): switch on "Remind me even when the app is closed" on the Prayer page, choose the prayers and how early (0–30 min), press "Send a test reminder". A scheduler (`.github/workflows/prayer-reminders.yml`, or cron-job.org) calls `/api/push/dispatch` every few minutes; the server works out whose prayer has just arrived (same on-device maths) and sends an encrypted push, once per prayer per day. Stored per device: the browser's push address, a ~100 m position, time zone, method and choices — no name or email. Only real browser push services are accepted as addresses (no open proxy). Needs the free Upstash Redis and VAPID keys (`npm run vapid`). Timing is within a few minutes, not to the second. Tested end to end with a fake push service (`tests/api.test.mjs`, `tests/push.test.mts`); the real browser push services themselves could not be reached from the test environment.
- **Offline recitation:** Settings → Offline → "Recitation without internet" saves a surah's audio per reciter (size shown first). The service worker answers audio and byte-range requests from the saved files, so it plays and seeks with no connection.
- **Typed cities:** the first lookup of a city also stores its position and time zone (position from OpenStreetMap, accepted only if our own calculation matches AlAdhan's times to within 3 minutes), so from then on that city's times are calculated on the device, on that city's own clock — including "next prayer".

## Going live

- **`DEPLOY.md`** — step-by-step: GitHub, Vercel, the free services to create (AI keys, Upstash Redis for shared rate limits, Pexels, Supabase, uptime monitor, error webhook) and a pre-launch checklist.
- **`SECURITY.md`** — what protects the app and its known limits. **Privacy, Terms and Sources & credits** pages are in the app (`/legal/*`); set `NEXT_PUBLIC_OPERATOR_NAME` and `NEXT_PUBLIC_CONTACT_EMAIL` and have the wording checked for your country.
- **CI** (`.github/workflows/ci.yml`) runs lint, types, all unit tests, `npm audit` and a production build on every push. Dependabot proposes weekly updates.
- **Monitoring**: `/api/health` for uptime checks; browser crashes are reported anonymously to `/api/client-error` (server log + optional `ERROR_WEBHOOK_URL`).
- **AI that keeps going**: 10+ independent free quotas (Gemini ×2 models, Groq ×2, Mistral ×2, GitHub Models, SambaNova, NVIDIA, Hugging Face, OpenRouter ×3, Cloudflare, local Ollama, optional keyless Pollinations), each resting separately when rate-limited; near-identical questions share a cached answer; optional `AI_DAILY_CALLS` cap; and a sources-only answer when every provider is busy.
- **Quality tools**: `npm run perf` (mobile-throttled load timings), `npm run a11y` (axe-core accessibility audit, light + dark, 24 pages), `npm run icons`, `npm run check:library`.

## Security

Strict response headers on every page (Content-Security-Policy limiting scripts, media, images, connections and frames to the sites the app really uses; HSTS; `X-Frame-Options: DENY`; `nosniff`; a Permissions-Policy that allows only location/microphone/camera/compass for this site). API keys stay on the server. Every API validates its input and is rate limited. `npm audit --omit=dev` reports 0 vulnerabilities (the build-only `shadcn` CLI is a dev dependency). Not done: a professional penetration test, and accounts/sync are only as secure as your Supabase row-level-security setup.

## Deliberately not built (and why)

- **An Islamic news feed.** No free, reliably licensed news API was verified; the Library stays current via Wikipedia instead.

- **A social network / user-uploaded video.** Reels are generated from verified sources and creation is local. A public feed with uploads needs
  a backend, storage, and real moderation — worth doing only with a team and policies in place.
- **Adhan audio.** Reminders are notifications; no adhan recording is bundled because a recording needs a licence you should choose yourself.
- **Halal-food scanner.** Ingredient rulings are contested and a wrong “halal” verdict is serious; this needs a vetted data source and scholar review.
- **Per-page mushaf glyph fonts** (the exact printed layout). The Mushaf view follows the standard 604-page pagination in a typographic layout.

## Known limits

- Menus are English; Quran translations, hadith and AI answers follow the chosen language.
- Prayer reminders fire only while the app is open (true background push needs a push server).
- Speech features use the browser’s recognition (Chrome/Edge). Matching is approximate; confirm in the mushaf.
- Reels audio autoplay needs one tap first (a browser rule). Reels are generated, not user-uploaded.
- The Mushaf view uses a typographic layout of the standard 604-page pagination, not the per-page glyph fonts of a printed mushaf.
- On-device AI could not be exercised end-to-end in the automated tests (needs a GPU); the surrounding plumbing is tested.
- Cloud sync uses newest-write-wins per item and has only been unit-tested (no live Supabase in the tests).
- Mosque data is community-mapped (OpenStreetMap); public map servers are sometimes busy, so the app falls back automatically.

## Sources & licences

Quran text/translations/tafsir/tajweed/word-by-word: Quran.Foundation API · Audio: EveryAyah, Quran.com CDN · Prayer times & Names: AlAdhan ·
Hadith: fawazahmed0/hadith-api · Duas: fitrahive/dua-dhikr · Maps: © OpenStreetMap contributors (ODbL) · Prices: gold-api.com,
ExchangeRate-API · Spaced repetition: ts-fsrs · Typeface: Amiri Quran (SIL OFL) · On-device AI: @mlc-ai/web-llm (Apache-2.0).
Translations keep their translators’ copyright, which is why `./data` is generated locally rather than committed.

- **Sleep timer** (🌙 in the audio player): stop recitation after 5–60 minutes with a gentle 4-second fade. Tested in the browser with a shortened clock.
- **Sunnah reminders** (same push system, optional checkboxes): morning adhkar (Fajr + 30 min), evening adhkar (Asr + 30 min), Friday Surat al-Kahf, Monday/Thursday fasting (evening before), white days 13–15 (evening before). Hijri days use the Umm al-Qura calculation, so a moon-sighting day can differ by one.

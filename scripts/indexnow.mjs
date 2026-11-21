// Tells Bing, Yandex and other IndexNow search engines about every page in one go, so new pages are found in minutes, not weeks.
// Setup (once): choose a key (for example the output of  node -e "console.log(require('crypto').randomBytes(16).toString('hex'))" ),
// set it in Vercel as INDEXNOW_KEY and redeploy, then run:   INDEXNOW_KEY=<the key> SITE=https://your-site npm run indexnow
// Google does not use IndexNow: submit the sitemap in Google Search Console instead.
const SITE = (process.env.SITE || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
const KEY = process.env.INDEXNOW_KEY || ''
if (!SITE.startsWith('https://') || !/^[a-zA-Z0-9-]{8,128}$/.test(KEY)) {
  console.error('Set SITE=https://your-site and INDEXNOW_KEY=<key> first.')
  process.exit(1)
}
const check = await fetch(`${SITE}/${KEY}.txt`)
if (!check.ok || (await check.text()).trim() !== KEY) {
  console.error(`The key file ${SITE}/${KEY}.txt is not being served yet. Set INDEXNOW_KEY in Vercel and redeploy first.`)
  process.exit(1)
}
const xml = await (await fetch(`${SITE}/sitemap.xml`)).text()
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
console.log(`Submitting ${urls.length} addresses…`)
for (let i = 0; i < urls.length; i += 9000) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(i, i + 9000) }),
  })
  console.log(res.status === 200 || res.status === 202 ? 'accepted' : `refused: HTTP ${res.status}`)
}

// Tests lecture channel parsing and YouTube-feed parsing.  Run: npm run test:lectures
import { DEFAULT_CHANNELS, effectiveChannels, parseChannels, parseFeed } from '../src/lib/lectures.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const ID1 = 'UC' + 'a'.repeat(22)
const ID2 = 'UC' + 'B'.repeat(22)

ok('channels: parses "Name|ID" pairs', parseChannels(`Alpha|${ID1}, Beta Talks|${ID2}`).length === 2)
ok('channels: ignores invalid ids, blanks and duplicates', parseChannels(`Bad|notanid, |${ID1}, Alpha|${ID1}, Again|${ID1}, Short|UC123`).length === 1)
ok('channels: empty / undefined are safe', parseChannels('').length === 0 && parseChannels(undefined).length === 0)
ok('channels: rejects ids with unsafe characters (they end up in a URL)', parseChannels(`X|UC${'a'.repeat(20)}/..`).length === 0 && parseChannels(`X|UC${'a'.repeat(21)}&`).length === 0)

const ch = { name: 'Alpha', id: ID1 }
const xml = `<?xml version="1.0"?><feed xmlns:yt="y" xmlns="a"><title>t</title>
<entry><id>yt:video:abcdefghijk</id><yt:videoId>abcdefghijk</yt:videoId><title>Patience &amp; &quot;Trust&quot; in Allah</title><published>2026-10-01T10:00:00+00:00</published></entry>
<entry><yt:videoId>BAD</yt:videoId><title>Too short id</title></entry>
<entry><yt:videoId>lmnopqrstuv</yt:videoId><title><![CDATA[Cdata <title>]]></title><published>2026-09-01T00:00:00+00:00</published></entry>
<entry><yt:videoId>wxyz0123456</yt:videoId></entry></feed>`
const items = parseFeed(xml, ch)
ok('feed: reads valid entries only (bad id / no title skipped)', items.length === 2, String(items.length))
ok('feed: decodes entities', items[0].title === 'Patience & "Trust" in Allah')
ok('feed: handles CDATA', items[1].title === 'Cdata <title>')
ok('feed: thumbnail comes from the official image host', items[0].thumb === 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg')
ok('feed: carries channel and date', items[0].channel === 'Alpha' && items[0].published.startsWith('2026-10-01'))
ok('feed: garbage in, nothing out', parseFeed('not xml', ch).length === 0 && parseFeed('', ch).length === 0)
ok('defaults: two starter channels with valid ids', DEFAULT_CHANNELS.length === 2 && DEFAULT_CHANNELS.every((c) => /^UC[A-Za-z0-9_-]{22}$/.test(c.id)))
ok('defaults: used when nothing is configured', effectiveChannels(undefined).length === 2 && effectiveChannels('').length === 2 && effectiveChannels('garbage|x').length === 2)
ok('defaults: your own list replaces them', effectiveChannels('Mine|' + ID1).length === 1 && effectiveChannels('Mine|' + ID1)[0].name === 'Mine')
ok('defaults: "none" turns lectures off', effectiveChannels('none').length === 0 && effectiveChannels(' NONE ').length === 0)
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

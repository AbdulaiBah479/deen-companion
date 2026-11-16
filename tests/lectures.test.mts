// Tests lecture channel parsing and YouTube-feed parsing.  Run: npm run test:lectures
import { DEFAULT_CHANNELS, agoToIso, effectiveChannels, parseChannelPage, parseChannels, parseFeed } from '../src/lib/lectures.ts'

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

// ── second source: the channel's own Videos page ──
const NOW = Date.parse('2026-11-16T12:00:00Z')
ok('"9d ago" and "9 days ago" are the same date', agoToIso('9d ago', NOW) === agoToIso('9 days ago', NOW) && agoToIso('9d ago', NOW).startsWith('2026-11-07'))
ok('minutes, months and years are told apart (m, mo, y)', agoToIso('5m ago', NOW) === new Date(NOW - 5 * 60_000).toISOString() && agoToIso('2 mo ago', NOW).startsWith('2026-09-17') && agoToIso('1y ago', NOW).startsWith('2025-11-16'))
ok('text that is not an age gives nothing', agoToIso('45K views', NOW) === '' && agoToIso('', NOW) === '')
const lockup = (id: string, title: string, ago: string, type = 'LOCKUP_CONTENT_TYPE_VIDEO') => ({ lockupViewModel: { contentType: type, contentId: id, metadata: { lockupMetadataViewModel: { title: { content: title }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: '45K' }, accessibilityLabel: '45 thousand views' }, { text: { content: ago }, accessibilityLabel: ago }] }] } } } } } })
const page = (items: unknown[]) => '<html><script>var ytInitialData = ' + JSON.stringify({ contents: { a: { b: items } } }) + ';</script></html>'
const chn = { name: 'Test', id: 'UCxxxxxxxxxxxxxxxxxxxxxx' }
const got = parseChannelPage(page([lockup('aaaaaaaaaaa', 'First &amp; best', '2d ago'), lockup('bbbbbbbbbbb', 'Second', '3 weeks ago'), lockup('aaaaaaaaaaa', 'Duplicate', '2d ago'), lockup('ccccccccccc', 'A playlist', '1d ago', 'LOCKUP_CONTENT_TYPE_PLAYLIST'), lockup('bad', 'Bad id', '1d ago'), lockup('ddddddddddd', 'No age', 'Premieres soon')]), chn, NOW)
ok('Videos page: real videos are listed with a title, a date, the official thumbnail and the channel', got.length === 2 && got[0].id === 'aaaaaaaaaaa' && got[0].title === 'First & best' && got[0].published.startsWith('2026-11-14') && got[0].thumb === 'https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg' && got[0].channel === 'Test', JSON.stringify(got.map((g) => g.id)))
ok('Videos page: playlists, repeated videos, bad ids and entries without an age are left out', !got.some((g) => ['ccccccccccc', 'bad', 'ddddddddddd'].includes(g.id)) && got.filter((g) => g.id === 'aaaaaaaaaaa').length === 1)
ok('Videos page: a page that is not what we expect gives nothing, never an error', parseChannelPage('<html>nothing</html>', chn, NOW).length === 0 && parseChannelPage('<script>var ytInitialData = {broken;</script>', chn, NOW).length === 0)
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

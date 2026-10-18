// Tests the Reels streak, karaoke caption timing and Pexels response shaping.  Run: npm run test:reels
import { DAILY_GOAL, milestoneMessage, prune, recordView, shiftDay, streakInfo, type ReelActivity } from '../src/lib/reel-streak.ts'
import { wordIndexAt } from '../src/lib/captions.ts'
import { TOPIC_QUERIES, pickFile, shapeVideos } from '../src/lib/pexels.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── streak ─────────
const T = '2026-10-16'
const day = (n: number, count = DAILY_GOAL): ReelActivity => ({ [shiftDay(T, n)]: Array.from({ length: count }, (_, i) => `r${n}-${i}`) })
const join = (...l: ReelActivity[]) => Object.assign({}, ...l) as ReelActivity

ok('empty log: no streak, 0/5', streakInfo({}, T).current === 0 && streakInfo({}, T).todayCount === 0 && streakInfo({}, T).remaining === DAILY_GOAL)
ok('same reel twice in a day counts once', Object.keys(recordView(recordView({}, T, 'a'), T, 'a')).length === 1 && recordView(recordView({}, T, 'a'), T, 'a')[T].length === 1)
let log: ReelActivity = {}
for (let i = 0; i < DAILY_GOAL - 1; i++) log = recordView(log, T, 'x' + i)
ok('4 of 5 today: goal not met, 1 remaining', !streakInfo(log, T).goalMet && streakInfo(log, T).remaining === 1)
log = recordView(log, T, 'x-last')
ok('5th reel meets the goal and starts a 1-day streak', streakInfo(log, T).goalMet && streakInfo(log, T).current === 1)

ok('3 consecutive days ending today = 3', streakInfo(join(day(0), day(-1), day(-2)), T).current === 3)
ok('streak survives until the day ends: yesterday+before met, today not yet', streakInfo(join(day(-1), day(-2), day(0, 2)), T).current === 2)
ok('a missed day breaks it: today + 2 days ago, gap yesterday', streakInfo(join(day(0), day(-2)), T).current === 1)
ok('missing yesterday and today: streak is 0', streakInfo(join(day(-2), day(-3)), T).current === 0)
ok('day below the goal does not count', streakInfo(join(day(0), day(-1, DAILY_GOAL - 1), day(-2)), T).current === 1)
ok('best streak remembers an older, longer run', streakInfo(join(day(0), day(-10), day(-11), day(-12), day(-13)), T).best === 4 && streakInfo(join(day(0), day(-10), day(-11), day(-12), day(-13)), T).current === 1)
ok('works across a month and year boundary', shiftDay('2027-01-01', -1) === '2026-12-31' && shiftDay('2026-03-01', -1) === '2026-02-28')
ok('shiftDay is stable over a DST change', shiftDay('2026-03-29', 1) === '2026-03-30' && shiftDay('2026-10-25', 1) === '2026-10-26')
const old = join({ '2020-01-01': ['a'] }, day(0))
ok('prune drops old days, keeps recent', !('2020-01-01' in prune(old, T)) && shiftDay(T, 0) in prune(old, T))
ok('milestones: day 7 and 30 have messages, day 5 does not', !!milestoneMessage(7) && !!milestoneMessage(30) && milestoneMessage(5) === null)

// ───────── caption timing ─────────
const words = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ']
ok('captions: nothing highlighted before playback', wordIndexAt(0, words) === -1 && wordIndexAt(NaN, words) === -1 && wordIndexAt(-1, words) === -1)
ok('captions: starts on the first word', wordIndexAt(0.01, words) === 0)
ok('captions: ends on the last word', wordIndexAt(1, words) === words.length - 1 && wordIndexAt(0.999, words) === words.length - 1)
let prev = -1
let monotonic = true
for (let p = 0.01; p <= 1; p += 0.01) {
  const i = wordIndexAt(p, words)
  if (i < prev) monotonic = false
  prev = i
}
ok('captions: highlight only moves forward and visits every word', monotonic)
const seen = new Set<number>()
for (let p = 0.005; p <= 1; p += 0.005) seen.add(wordIndexAt(p, words))
ok('captions: every word gets highlighted at some point', seen.size === words.length)
ok('captions: no words -> -1', wordIndexAt(0.5, []) === -1)
const long = ['ا', 'الرَّحْمَٰنِ', 'ب']
ok('captions: longer words stay highlighted longer', (() => {
  let a = 0
  let b = 0
  for (let p = 0.001; p < 1; p += 0.001) {
    const i = wordIndexAt(p, long)
    if (i === 0) a++
    if (i === 1) b++
  }
  return b > a
})())

// ───────── Pexels shaping ─────────
const f = (o: object) => ({ file_type: 'video/mp4', link: 'https://videos.pexels.com/x.mp4', width: 720, height: 1280, ...o })
ok('pickFile: ignores HLS and links without a size', pickFile([{ quality: 'hls', file_type: 'application/x-mpegURL', link: 'https://v/x.m3u8', width: null, height: null }]) === null)
ok(
  'pickFile: smallest file that is still at least 720p',
  pickFile([f({ link: 'https://v/hd.mp4', width: 1080, height: 1920 }), f({ link: 'https://v/sd.mp4', width: 540, height: 960 }), f({ link: 'https://v/mid.mp4', width: 720, height: 1280 })])?.link === 'https://v/mid.mp4'
)
ok('pickFile: falls back to the largest when all are small', pickFile([f({ link: 'https://v/a.mp4', width: 240, height: 426 }), f({ link: 'https://v/b.mp4', width: 360, height: 640 })])?.link === 'https://v/b.mp4')
ok('pickFile: rejects non-https links (except localhost for tests)', pickFile([f({ link: 'http://evil.example/x.mp4' })]) === null && pickFile([f({ link: 'http://localhost:4010/x.mp4' })]) !== null)
const sample = {
  videos: [
    { id: 1, url: 'https://www.pexels.com/video/1/', image: 'https://img/1.jpg', duration: 12, user: { name: 'Jane', url: 'https://www.pexels.com/@jane' }, video_files: [f({})] },
    { id: 2, image: 'https://img/2.jpg', video_files: [] },
    { id: 3, video_files: [f({})] },
    { id: 4, image: 'https://img/4.jpg', video_files: [f({})] },
  ],
}
const shaped = shapeVideos(sample)
ok('shapeVideos: keeps playable videos only (drops no-file and no-poster)', shaped.length === 2 && shaped[0].id === 1 && shaped[1].id === 4)
ok('shapeVideos: carries the videographer credit and link', shaped[0].credit.name === 'Jane' && shaped[0].credit.url.includes('@jane'))
ok('shapeVideos: missing user falls back to a generic credit', shaped[1].credit.name === 'Pexels contributor')
ok('shapeVideos: garbage input yields an empty list', shapeVideos(null).length === 0 && shapeVideos({}).length === 0 && shapeVideos({ videos: 'x' }).length === 0)
ok('every reel topic has video search queries', ['foryou', 'patience', 'gratitude', 'mercy', 'hope', 'forgiveness', 'family', 'knowledge', 'charity', 'prayer', 'death'].every((t) => TOPIC_QUERIES[t]?.length))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

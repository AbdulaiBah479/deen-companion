import { qiblaBearing, distanceToKaaba } from '../src/lib/qibla.ts'
import { mulberry32, hashSeed, shuffle } from '../src/lib/random.ts'
import { newStoredCard, review, isDue, previewIntervals } from '../src/lib/srs.ts'
let fails = 0
const ok = (name: string, cond: boolean, info = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); if (!cond) fails++ }
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

// Qibla: well-known bearings (degrees clockwise from true north)
const cities: [string, number, number, number][] = [
  ['London', 51.5074, -0.1278, 119], ['New York', 40.7128, -74.006, 58.5],
  ['Jakarta', -6.2088, 106.8456, 295], ['Sydney', -33.8688, 151.2093, 277], ['Lagos', 6.5244, 3.3792, 63],
]
for (const [n, la, lo, exp] of cities) { const b = qiblaBearing(la, lo); ok(`qibla ${n}`, near(b, exp, 2), `got ${b.toFixed(1)} expected ~${exp}`) }
ok('distance London->Kaaba ~4,780km', near(distanceToKaaba(51.5074, -0.1278), 4780, 60), distanceToKaaba(51.5074, -0.1278).toFixed(0))
ok('distance at Kaaba ~0', distanceToKaaba(21.422487, 39.826206) < 0.1)

// Seeded RNG: deterministic + shuffle keeps elements
const a = mulberry32(hashSeed('2026-10-16')), b = mulberry32(hashSeed('2026-10-16')), c = mulberry32(hashSeed('2026-10-17'))
const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()]
ok('same seed -> same sequence', sa.join() === sb.join())
ok('different day -> different sequence', sa.join() !== sc.join())
const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const sh = shuffle(arr, mulberry32(7))
ok('shuffle keeps all items', [...sh].sort((x, y) => x - y).join() === arr.join())
ok('shuffle does not mutate input', arr.join() === '1,2,3,4,5,6,7,8,9,10')
ok('values in [0,1)', Array.from({ length: 1000 }, mulberry32(1)).every((v) => v >= 0 && v < 1))

// SRS
const now = new Date('2026-10-16T10:00:00Z')
const card = newStoredCard(now)
ok('new card is due immediately', isDue(card, now))
const good = review(card, 'good', now), again = review(card, 'again', now), easy = review(card, 'easy', now)
ok('after Good: not due now', !isDue(good, now))
ok('Easy scheduled later than Good', new Date(easy.due) > new Date(good.due), `${good.due} < ${easy.due}`)
ok('Again scheduled no later than Good', new Date(again.due) <= new Date(good.due))
const later = review(good, 'good', new Date(good.due))
ok('second Good review pushes interval further out', new Date(later.due).getTime() - new Date(good.due).getTime() > new Date(good.due).getTime() - now.getTime())
ok('stored card is JSON-safe round trip', JSON.stringify(JSON.parse(JSON.stringify(good))) === JSON.stringify(good))
const rt = review(JSON.parse(JSON.stringify(good)), 'good', new Date(good.due))
ok('review works on a card reloaded from JSON', typeof rt.due === 'string' && !Number.isNaN(Date.parse(rt.due)))
const pv = previewIntervals(card, now)
ok('preview gives labels for all 4 grades', ['again', 'hard', 'good', 'easy'].every((g) => /^\d+[mhd]$/.test((pv as Record<string, string>)[g])), JSON.stringify(pv))
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0)

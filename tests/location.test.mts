// Tests the location helpers.  Run: npm run test:location
import { distanceKm, errorMessage, hasMoved } from '../src/lib/location.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const london = { lat: 51.5074, lng: -0.1278 }
const paris = { lat: 48.8566, lng: 2.3522 }
const d = distanceKm(london, paris)
ok('London–Paris is about 344 km', d > 340 && d < 348, d.toFixed(1))
ok('distance to self is 0', distanceKm(london, london) === 0)
ok('distance is symmetric', Math.abs(distanceKm(london, paris) - distanceKm(paris, london)) < 1e-9)
ok('Makkah–Madinah is about 340 km', Math.abs(distanceKm({ lat: 21.4225, lng: 39.8262 }, { lat: 24.4672, lng: 39.6111 }) - 340) < 10)
ok('antipodes do not break (NaN guard)', Number.isFinite(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })))
ok('a few km of GPS drift is not "moved"', !hasMoved(london, { lat: 51.52, lng: -0.1 }))
ok('another city is "moved"', hasMoved(london, paris))
ok('every error has a friendly message', ['denied', 'unsupported', 'timeout', 'unavailable'].every((e) => errorMessage(e).length > 20))
ok('blocked message tells you what to do', /browser settings|choose a city/i.test(errorMessage('denied')))
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

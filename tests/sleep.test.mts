// Tests the sleep-timer maths.  Run: npm run test:sleep
import { FADE_MS, SLEEP_OPTIONS, fadeFactor, formatRemaining, msPerMinute, remainingMs } from '../src/lib/sleep-timer.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
ok('options are sensible (5 to 60 minutes, ascending)', SLEEP_OPTIONS[0] === 5 && SLEEP_OPTIONS.at(-1) === 60 && SLEEP_OPTIONS.every((m, i) => i === 0 || m > SLEEP_OPTIONS[i - 1]))
ok('remaining time never goes negative', remainingMs(1000, 400) === 600 && remainingMs(1000, 1000) === 0 && remainingMs(1000, 5000) === 0)
ok('full volume until the last few seconds', fadeFactor(60_000) === 1 && fadeFactor(FADE_MS) === 1)
ok('then it eases down to silence', fadeFactor(FADE_MS / 2) === 0.5 && fadeFactor(0) === 0 && fadeFactor(-10) === 0)
let prev = 1
let smooth = true
for (let r = FADE_MS; r >= 0; r -= 100) { const f = fadeFactor(r); if (f > prev + 1e-9) smooth = false; prev = f }
ok('volume only ever goes down during the fade', smooth)
ok('countdown text', formatRemaining(5 * 60_000) === '5:00' && formatRemaining(65_000) === '1:05' && formatRemaining(900) === '0:01' && formatRemaining(0) === '0:00' && formatRemaining(59_001) === '1:00')
ok('a "minute" is 60 s by default and a test can shrink it', msPerMinute() === 60_000 && ((globalThis as { __DEEN_SLEEP_MS?: number }).__DEEN_SLEEP_MS = 1000, msPerMinute() === 1000) && ((globalThis as { __DEEN_SLEEP_MS?: number }).__DEEN_SLEEP_MS = -5, msPerMinute() === 60_000))
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

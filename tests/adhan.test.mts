// Tests the prayer-alarm rules: next prayer and countdown, which alarms fire, and repairing damaged settings.  Run: npm run test:adhan
import { existsSync } from 'node:fs'
import { ADHANS, DEFAULT_ALARMS, cleanAlarms, countdown, nextPrayerIn, secondsNowIn, upcomingAlarms, type AlarmSettings } from '../src/lib/adhan.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const T = { fajr: '05:30', sunrise: '06:45', dhuhr: '12:30', asr: '15:45', maghrib: '18:20', isha: '19:40' }
const at = (h: number, m = 0, s = 0) => h * 3600 + m * 60 + s
const on: AlarmSettings = { ...DEFAULT_ALARMS, on: true }

// ───────── next prayer and countdown ─────────
ok('next: before Fajr it is Fajr', nextPrayerIn(T, at(3)).prayer === 'fajr' && nextPrayerIn(T, at(3)).inSeconds === at(2, 30))
ok('next: between Dhuhr and Asr it is Asr, with the right countdown', nextPrayerIn(T, at(13)).prayer === 'asr' && nextPrayerIn(T, at(13)).inSeconds === at(2, 45))
ok('next: exactly at a prayer’s time the next one is the following prayer', nextPrayerIn(T, at(12, 30)).prayer === 'asr')
const late = nextPrayerIn(T, at(22))
ok('next: after Isha it is tomorrow’s Fajr (about 7½ hours away), marked as tomorrow', late.prayer === 'fajr' && late.tomorrow && late.inSeconds === at(7, 30))
ok('next: one second before midnight is still tomorrow’s Fajr', nextPrayerIn(T, at(23, 59, 59)).inSeconds === at(5, 30, 1))
ok('countdown: formats minutes:seconds and hours:minutes:seconds', countdown(75) === '1:15' && countdown(3725) === '1:02:05' && countdown(0) === '0:00' && countdown(-5) === '0:00')

// ───────── which alarms fire ─────────
ok('alarms: switched off means none', upcomingAlarms(T, at(1), DEFAULT_ALARMS).length === 0)
const a1 = upcomingAlarms(T, at(1), on)
ok('alarms: with everything on at 1 am, all five prayers fire today, in order', a1.map((a) => a.prayer).join() === 'fajr,dhuhr,asr,maghrib,isha' && a1.every((x) => x.mode === 'adhan'))
const a2 = upcomingAlarms(T, at(19), on)
ok('alarms: at 7 pm Isha is next, then tomorrow’s Fajr', a2[0].prayer === 'isha' && a2[1].prayer === 'fajr' && a2[1].delayMs === (86400 - at(19) + at(5, 30)) * 1000, a2.map((a) => a.key).join())
ok('alarms: nothing fires more than 24 hours ahead and nothing is in the past', a2.every((a) => a.delayMs > 0 && a.delayMs <= 86400_000))
ok('alarms: at 20:00 (all of today’s prayers done) the next 24 hours still hold every prayer once', upcomingAlarms(T, at(20), on).length === 5)
ok('alarms: a prayer set to “off” never fires', !upcomingAlarms(T, at(1), { ...on, modes: { ...on.modes, asr: 'off' } }).some((a) => a.prayer === 'asr'))
const lead = upcomingAlarms(T, at(1), { ...on, lead: 10 })
ok('alarms: a 10-minute lead adds a gentle notification 10 minutes before each prayer', lead.filter((a) => a.kind === 'lead').length === 5 && lead.find((a) => a.prayer === 'dhuhr' && a.kind === 'lead')!.delayMs === (at(12, 20) - at(1)) * 1000 && lead.filter((a) => a.kind === 'lead').every((a) => a.mode === 'notify'))
ok('alarms: a lead alarm that has already passed rolls to tomorrow instead of firing now', upcomingAlarms(T, at(12, 25), { ...on, lead: 10 }).find((a) => a.prayer === 'dhuhr' && a.kind === 'lead')!.delayMs > 20 * 3600_000)
ok('alarms: sunrise is only included when asked for', !upcomingAlarms(T, at(1), on).some((a) => a.prayer === 'sunrise') && upcomingAlarms(T, at(1), { ...on, sunrise: true }).some((a) => a.prayer === 'sunrise' && a.mode === 'notify'))
ok('alarms: a prayer at exactly this second does not fire twice (it is next tomorrow)', upcomingAlarms(T, at(12, 30), on).find((a) => a.prayer === 'dhuhr')!.delayMs === 86400_000)

// ───────── settings repair ─────────
ok('settings: nothing or rubbish gives the defaults', JSON.stringify(cleanAlarms(null)) === JSON.stringify(DEFAULT_ALARMS) && JSON.stringify(cleanAlarms('x')) === JSON.stringify(DEFAULT_ALARMS) && JSON.stringify(cleanAlarms(42)) === JSON.stringify(DEFAULT_ALARMS))
const bad = cleanAlarms({ on: 'yes', modes: { fajr: 'loud', dhuhr: 'notify' }, adhan: '../../etc', volume: 50, lead: 7, sunrise: 1 })
ok('settings: bad values are replaced one by one, good ones kept', bad.on === false && bad.modes.fajr === 'adhan' && bad.modes.dhuhr === 'notify' && bad.adhan === 'aaqib' && bad.volume === 0.8 && bad.lead === 0 && bad.sunrise === false)
ok('settings: a good saved value survives', cleanAlarms({ ...on, adhan: 'azan', volume: 0.5, lead: 15, sunrise: true }).adhan === 'azan' && cleanAlarms({ ...on, lead: 15 }).lead === 15)

// ───────── time zones and the recordings ─────────
const noon = new Date('2026-06-01T12:00:00Z')
ok('zones: seconds since midnight follow the place’s own zone', secondsNowIn('Asia/Tokyo', noon) === at(21) && secondsNowIn('America/New_York', noon) === at(8))
ok('recordings: every adhan file exists in public/adhan, with a credit and a licence', ADHANS.length >= 3 && ADHANS.every((a) => existsSync('public' + a.file) && a.credit && a.licence && /^https:\/\/commons\.wikimedia\.org\//.test(a.source)))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

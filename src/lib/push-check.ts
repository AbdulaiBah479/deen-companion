// "Why am I not getting notifications?": turns what this device and the server report into a short list of plain findings, each with
// what to do about it. Pure, so every case is tested. The page gathers the facts; the server says whether it knows this device.

export type Facts = {
  secure: boolean // the page is on https
  hasSW: boolean
  hasPush: boolean // PushManager exists
  hasNotification: boolean
  permission: 'granted' | 'denied' | 'default' | 'unsupported'
  ios: boolean
  standalone: boolean // opened from the home screen (an installed app)
  subscribed: boolean // this browser has a push subscription
  serverKnows: boolean | null // the server has this device's reminder (null = could not ask)
  serverPrayers?: number
  schedulerOk: boolean | null // the timer that sends reminders ran recently (null = unknown)
  schedulerAgeMin?: number | null
  locationSaved: boolean
}
export type Finding = { id: string; level: 'ok' | 'warn' | 'bad'; title: string; fix?: string }

export function diagnose(f: Facts): Finding[] {
  const out: Finding[] = []
  const add = (id: string, level: Finding['level'], title: string, fix?: string) => out.push({ id, level, title, fix })

  if (!f.secure) add('https', 'bad', 'This page is not on a secure address', 'Open the app from its https:// address. Notifications only work on secure pages.')
  // An iPhone only allows notifications for an app that was added to the Home Screen (iOS 16.4 or newer).
  if (f.ios && !f.standalone) {
    add('ios-install', 'bad', 'On an iPhone or iPad, notifications only work from the app on your Home Screen', 'In Safari tap Share, then “Add to Home Screen”. Open the app from that icon, then switch reminders on there.')
    return out
  }
  if (!f.hasSW || !f.hasPush || !f.hasNotification) {
    add('unsupported', 'bad', 'This browser cannot receive notifications', 'Use the latest Chrome, Edge, Firefox or Safari (iPhone: the Home Screen app).')
    return out
  }
  if (f.permission === 'denied') {
    add('blocked', 'bad', 'Notifications are blocked for this app on this device', 'Open the browser’s site settings for this app, set Notifications to Allow, then come back and press “Check again”.')
    return out
  }
  if (f.permission === 'default') {
    add('ask', 'warn', 'The device has not been asked yet', 'Switch reminders on below and tap Allow when the phone asks.')
    return out
  }
  add('permission', 'ok', 'Notifications are allowed')
  if (!f.subscribed) {
    add('not-subscribed', 'bad', 'Reminders are not switched on in this browser', 'Switch “Prayer reminders” on below. If it was on before, switch it off and on again.')
    return out
  }
  add('subscribed', 'ok', 'This browser is signed up for reminders')
  if (f.serverKnows === false) add('server-missing', 'bad', 'The app’s server does not have this device', 'Press “Fix it” (it signs this device up again), or switch reminders off and on.')
  else if (f.serverKnows === true) add('server-ok', 'ok', 'The app’s server knows this device')
  else add('server-unknown', 'warn', 'Could not ask the server about this device', 'Check your internet connection and press “Check again”.')
  if (!f.locationSaved) add('no-place', 'warn', 'No place is saved', 'Prayer times depend on your place. Allow location or choose your city on the Prayer page.')
  if (f.schedulerOk === false) add('timer', 'bad', 'The timer that sends reminders has not run recently', 'This is on the app’s side, not your phone. It has been reported; reminders will resume when it runs again.')
  else if (f.schedulerOk === true) add('timer-ok', 'ok', 'The reminder timer is running')
  if (f.ios) add('ios-note', 'warn', 'iPhone notes', 'If a reminder does not appear, make sure Focus or Do Not Disturb is not hiding it, and that Settings, Notifications lists this app as Allowed.')
  else add('android-note', 'warn', 'If it works but arrives late or not at all on Android', 'Open the phone’s battery settings for this browser or app and set it to “Unrestricted” (not “Optimized”), and keep Do Not Disturb off.')
  return out
}

// Is everything the page can check fine? (The two notes at the end are advice, not faults.)
export const allGood = (items: Finding[]) => items.length > 0 && items.every((i) => i.level === 'ok' || i.id === 'ios-note' || i.id === 'android-note')

// Prints a fresh pair of VAPID keys for prayer reminders (Web Push).   Run: npm run vapid
// Put them in .env.local (or your host's environment variables); keep the private key secret. Also set CRON_SECRET to a long random string.
import webpush from 'web-push'
import { randomBytes } from 'node:crypto'

const k = webpush.generateVAPIDKeys()
console.log('VAPID_PUBLIC_KEY=' + k.publicKey)
console.log('VAPID_PRIVATE_KEY=' + k.privateKey)
console.log('VAPID_SUBJECT=mailto:you@example.com   # your real contact email')
console.log('CRON_SECRET=' + randomBytes(24).toString('base64url'))

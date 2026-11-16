// Makes a strong new scheduler secret and puts it on your clipboard (it is never printed), so it can be pasted into Vercel and cron-job.org.
// Run: npm run secret        (Windows, macOS and Linux)
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const secret = randomBytes(32).toString('base64url') // 43 characters
const tools = process.platform === 'win32' ? [['clip', []]] : process.platform === 'darwin' ? [['pbcopy', []]] : [['xclip', ['-selection', 'clipboard']], ['wl-copy', []]]
let copied = false
for (const [cmd, args] of tools) {
  const r = spawnSync(cmd, args, { input: secret, shell: process.platform === 'win32' })
  if (r.status === 0) {
    copied = true
    break
  }
}
if (copied) console.log('A new secret (' + secret.length + ' characters) is on your clipboard. Paste it where the steps say, and do not share it.')
else console.log('Could not reach the clipboard. Your new secret is:\n' + secret + '\nCopy it now; it will not be shown again.')

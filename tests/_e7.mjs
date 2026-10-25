import fs from 'node:fs'
let e = fs.readFileSync('tests/e2e.mjs', 'utf8')
const rep = (a, b) => { if (!e.includes(a)) throw new Error('missing ' + a.slice(0, 80)); e = e.split(a).join(b) }
rep("['Simple', 'Standard', 'In-depth'].every((x) => /Answer:/.test(document.body ? '' : '') || true) && (await ev(", "(await ev(")
rep('document.querySelectorAll(".bg-\\[\\#0F766E\\].text-white.rounded-2xl").length', 'document.querySelectorAll("[data-role=user]").length')
fs.writeFileSync('tests/e2e.mjs', e)
let c = fs.readFileSync('src/app/(app)/companion/page.tsx', 'utf8')
const a = "<div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>"
if (!c.includes(a)) throw new Error('companion anchor')
c = c.replace(a, "<div key={i} data-role={m.role} className={m.role === 'user' ? 'flex justify-end' : ''}>")
fs.writeFileSync('src/app/(app)/companion/page.tsx', c)

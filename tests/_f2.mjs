import fs from 'node:fs'
let s = fs.readFileSync('tests/e2e.mjs', 'utf8')
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing ' + a.slice(0, 50)); s = s.replace(a, () => b) }
rep("t('hadith: a chapter shows its hadith (Bukhari 1 first)', /Umar bin Al-Khattab/.test(await text()) && /7 hadith/.test(await text()))", "t('hadith: a chapter shows its hadith (Bukhari 1 first)', /Umar bin Al-Khattab/.test(await text()) && /7 hadith/.test(await text()), (await text()).replace(/\s+/g, ' ').slice(0, 300))")
rep("t(\"hadith: Nawawi's 40 browsable collection -> chapter -> hadith\", /Amirul Mu/.test(await text()))", "t(\"hadith: Nawawi's 40 browsable collection -> chapter -> hadith\", /Amirul Mu/.test(await text()), (await text()).replace(/\s+/g, ' ').slice(0, 300))")
fs.writeFileSync('tests/e2e.mjs', s)

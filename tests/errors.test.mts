// Tests crash-report cleaning.  Run: npm run test:errors
import { cleanPage, errorKey, parseClientError } from '../src/lib/error-report.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
ok('page: query string and fragment are removed', cleanPage('/search?q=my+secret#top') === '/search')
ok('page: full URLs are reduced to the path', cleanPage('https://app.example/quran/2?x=1') === '/quran/2')
ok('page: garbage never throws', cleanPage('::::').length <= 120 && cleanPage('').length <= 120)
const e = parseClientError({ kind: 'rejection', message: '  Failed   to fetch\n', source: 'https://cdn.x/_next/static/a.js?v=2#h', page: '/prayer?city=Cairo' })
ok('report: tidied (spaces, source path only, page path only)', e?.message === 'Failed to fetch' && e.source === '/_next/static/a.js' && e.page === '/prayer' && e.kind === 'rejection', JSON.stringify(e))
ok('report: unknown kind becomes "error"', parseClientError({ kind: 'weird', message: 'm' })?.kind === 'error')
ok('report: overly long text is cut', (parseClientError({ message: 'x'.repeat(5000) })?.message.length ?? 0) === 300)
ok('report: rejects non-objects and empty messages', [null, 'str', 5, [], {}, { message: '   ' }].every((b) => parseClientError(b) === null))
ok('key: same error → same key; different → different', errorKey(e!) === errorKey({ ...e! }) && errorKey(e!) !== errorKey({ ...e!, message: 'other' }))
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

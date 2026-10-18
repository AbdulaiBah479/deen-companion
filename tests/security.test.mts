// Tests the Content-Security-Policy builder.  Run: npm run test:security
import { buildCsp } from '../src/lib/csp.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const dir = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(name + ' ')) ?? ''

const prod = buildCsp({}, false)
ok('prod: scripts only from this site (no eval, no foreign hosts)', dir(prod, 'script-src') === "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'")
ok("prod: no wildcard '*' source and no 'unsafe-eval' anywhere", !/ \* /.test(prod + ' ') && !prod.includes("'unsafe-eval'"))
ok('prod: cannot be framed, no plugins, base/form locked', prod.includes("frame-ancestors 'none'") && prod.includes("object-src 'none'") && prod.includes("base-uri 'self'") && prod.includes("form-action 'self'"))
ok('prod: only YouTube’s privacy player may be framed', dir(prod, 'frame-src') === 'frame-src https://www.youtube-nocookie.com')
ok('prod: no websockets', !/\bwss?:/.test(prod))
ok('prod: default is deny-by-default to this site', prod.startsWith("default-src 'self'"))
ok('dev: allows eval/websockets for hot reload only', buildCsp({}, true).includes("'unsafe-eval'") && /\bws:/.test(buildCsp({}, true)))

const sb = buildCsp({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/rest/v1?x=1' }, false)
ok('supabase: only its origin (no path) is added to connect-src', dir(sb, 'connect-src').includes(' https://abc.supabase.co') && !dir(sb, 'connect-src').includes('/rest'))
ok('supabase: an invalid URL is ignored, not a crash', buildCsp({ NEXT_PUBLIC_SUPABASE_URL: 'not a url' }, false).startsWith("default-src 'self'"))

const ex = buildCsp({ CSP_EXTRA_HOSTS: 'http://localhost:4010, ,http://x.test' }, false)
ok('extra hosts: added to images, media and connections when configured', ['img-src', 'media-src', 'connect-src'].every((d) => dir(ex, d).includes('http://localhost:4010') && dir(ex, d).includes('http://x.test')))
ok('extra hosts: absent by default', !prod.includes('localhost'))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

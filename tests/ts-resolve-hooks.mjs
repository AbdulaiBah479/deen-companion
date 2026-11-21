// Lets plain Node resolve extensionless relative imports to .ts files (the app code is written for Next's bundler).
import { existsSync } from 'node:fs'

export async function resolve(specifier, context, nextResolve) {
  // `server-only` is a Next.js build-time guard; outside Next it is just an empty module.
  if (specifier === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true }
  // The "@/" shortcut for the src folder (set in tsconfig.json), so route files such as sitemap.ts can be tested too.
  if (specifier.startsWith('@/')) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      const url = new URL('../src/' + specifier.slice(2) + ext, import.meta.url)
      if (existsSync(url)) return { url: url.href, shortCircuit: true }
    }
  }
  if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return await nextResolve(specifier + '.ts', context) } catch {}
  }
  return nextResolve(specifier, context)
}

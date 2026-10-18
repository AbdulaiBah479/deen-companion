// Lets plain Node resolve extensionless relative imports to .ts files (the app code is written for Next's bundler).
export async function resolve(specifier, context, nextResolve) {
  // `server-only` is a Next.js build-time guard; outside Next it is just an empty module.
  if (specifier === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true }
  if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return await nextResolve(specifier + '.ts', context) } catch {}
  }
  return nextResolve(specifier, context)
}

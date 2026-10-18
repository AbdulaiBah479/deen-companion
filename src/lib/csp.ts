// Content-Security-Policy: the browser may only load code from this site, and only talk to / show media from the places the app
// actually uses. Anything injected by a bug or a bad dependency can't phone home or load a foreign script.
// Built per request (see proxy.ts) so deployment settings such as the Supabase URL are read at run time, not baked in at build time.
// 'unsafe-inline' scripts are needed for Next.js's own bootstrap data; everything else is locked down.

export function buildCsp(env: Record<string, string | undefined> = process.env, dev = env.NODE_ENV !== 'production'): string {
  let supabase: string[] = []
  try {
    if (env.NEXT_PUBLIC_SUPABASE_URL) supabase = [new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin]
  } catch {}
  // Hosts added only when explicitly configured (e.g. a local fake server during tests).
  const extra = (env.CSP_EXTRA_HOSTS || '').split(',').map((s) => s.trim()).filter(Boolean)

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    // Pexels posters, Wikipedia thumbnails (places only), YouTube lecture thumbnails, canvas/blob images for share cards.
    ["img-src 'self' data: blob: https://images.pexels.com https://upload.wikimedia.org https://thumb.wikimedia.org https://i.ytimg.com", ...extra].join(' '),
    // Recitation audio, reel videos (Pexels), recorded reels.
    ["media-src 'self' blob: https://everyayah.com https://audio.qurancdn.com https://videos.pexels.com", ...extra].join(' '),
    // Saving recitation for offline use (EveryAyah allows it), sync (Supabase), and the optional on-device AI model download (Hugging Face + its prebuilt model libraries).
    ["connect-src 'self' blob: data: https://everyayah.com https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com", ...supabase, ...extra, ...(dev ? ['ws:', 'wss:'] : [])].join(' '),
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    'frame-src https://www.youtube-nocookie.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

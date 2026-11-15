// Reading comfort: a text size for the whole app, high contrast, a plainer font, and less motion. Saved on the device and applied
// to <html> before the first paint (the boot script in layout.tsx mirrors apply()). The rules for each setting are in globals.css.
export type A11y = { scale: number; contrast: boolean; plainFont: boolean; calm: boolean }
export const DEFAULT_A11Y: A11y = { scale: 100, contrast: false, plainFont: false, calm: false }
export const SCALES = [100, 115, 130, 150]

export function cleanA11y(raw: unknown): A11y {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<A11y>
  return {
    scale: SCALES.includes(r.scale as number) ? (r.scale as number) : 100,
    contrast: r.contrast === true,
    plainFont: r.plainFont === true,
    calm: r.calm === true,
  }
}

// The attributes to put on <html>: undefined means "remove".
export function attrs(a: A11y): Record<string, string | undefined> {
  return { 'data-scale': a.scale === 100 ? undefined : String(a.scale), 'data-contrast': a.contrast ? 'high' : undefined, 'data-font': a.plainFont ? 'plain' : undefined, 'data-calm': a.calm ? 'on' : undefined }
}
export function apply(a: A11y, root: HTMLElement = document.documentElement) {
  for (const [k, v] of Object.entries(attrs(a))) {
    if (v === undefined) root.removeAttribute(k)
    else root.setAttribute(k, v)
  }
}

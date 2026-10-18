// Picks "of the day" items. The same date gives the same pick for everyone, consecutive days always differ, and nothing repeats
// until the whole pool has been used once (thousands of days for the Quran) — unlike hashing the date, which clusters.

export const dayNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
// Large steps that look random day to day. One of them is always coprime with the pool size, which guarantees a full cycle.
const STRIDES = [7919, 7927, 7933, 7937, 7949, 7951, 7963, 7993]

export function dailyIndex(dateKey: string, poolSize: number, salt = 0): number {
  if (poolSize <= 1) return 0
  const stride = STRIDES.find((s) => gcd(s % poolSize || poolSize, poolSize) === 1) ?? 1
  return (((dayNumber(dateKey) * stride + salt * 104_729) % poolSize) + poolSize) % poolSize
}

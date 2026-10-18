import { NextResponse } from 'next/server'

// Live gold & silver spot price (gold-api.com, no key) and currency rates (open.er-api.com, no key).
// Returns USD per gram plus a rate table so the Zakat calculator can show prices in the user's currency.
const OUNCE_G = 31.1034768

export async function GET() {
  try {
    const [gold, silver, fx] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU', { next: { revalidate: 900 } }).then((r) => r.json()),
      fetch('https://api.gold-api.com/price/XAG', { next: { revalidate: 900 } }).then((r) => r.json()),
      fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 21600 } }).then((r) => r.json()).catch(() => null),
    ])
    if (typeof gold.price !== 'number' || typeof silver.price !== 'number') throw new Error('bad price data')
    return NextResponse.json({
      usdPerGram: { gold: gold.price / OUNCE_G, silver: silver.price / OUNCE_G },
      rates: fx?.rates ?? { USD: 1 },
      updatedAt: gold.updatedAt,
    })
  } catch {
    return NextResponse.json({ error: 'Live metal prices are unavailable right now. Enter prices manually.' }, { status: 502 })
  }
}

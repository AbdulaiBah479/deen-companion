// Server side of "Support the app": the ledger and the sponsor slot live as small JSON documents in the free Redis.
import { EMPTY_LEDGER, NO_SPONSOR, parseLedger, parseSponsor, type Ledger, type Sponsor } from './support-shared'
import { redis, redisConfigured } from './redis'

const LEDGER = 'site:ledger'
const SPONSOR = 'site:sponsor'

async function readJson<T>(key: string, parse: (v: unknown) => T | null, fallback: T): Promise<T> {
  if (!redisConfigured()) return fallback
  try {
    const [raw] = (await redis([['GET', key]])) as [string | null]
    return raw ? (parse(JSON.parse(raw)) ?? fallback) : fallback
  } catch {
    return fallback
  }
}

export const readLedger = () => readJson<Ledger>(LEDGER, parseLedger, EMPTY_LEDGER)
export const readSponsor = () => readJson<Sponsor>(SPONSOR, parseSponsor, NO_SPONSOR)
export const writeLedger = async (l: Ledger) => void (await redis([['SET', LEDGER, JSON.stringify(l)]]))
export const writeSponsor = async (s: Sponsor) => void (await redis([['SET', SPONSOR, JSON.stringify(s)]]))

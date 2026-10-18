// Spaced repetition using the FSRS algorithm (ts-fsrs). Cards are stored as JSON in localStorage,
// so dates are serialized to ISO strings and revived when scheduling.

import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'

export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string }

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }))

export function newStoredCard(now: Date = new Date()): StoredCard {
  return serialize(createEmptyCard(now))
}

function serialize(c: Card): StoredCard {
  return { ...c, due: c.due.toISOString(), last_review: c.last_review?.toISOString() }
}

function revive(c: StoredCard): Card {
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined }
}

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'

const GRADES: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

export function review(card: StoredCard, grade: ReviewGrade, now: Date = new Date()): StoredCard {
  const result = scheduler.next(revive(card), now, GRADES[grade])
  return serialize(result.card)
}

export function isDue(card: StoredCard, now: Date = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime()
}

// Human-readable preview of the next interval for each grade (e.g. "10m", "3d").
export function previewIntervals(card: StoredCard, now: Date = new Date()): Record<ReviewGrade, string> {
  const out = {} as Record<ReviewGrade, string>
  for (const g of Object.keys(GRADES) as ReviewGrade[]) {
    const next = scheduler.next(revive(card), now, GRADES[g]).card
    const mins = Math.max(1, Math.round((next.due.getTime() - now.getTime()) / 60000))
    out[g] =
      mins < 60 ? `${mins}m` : mins < 60 * 24 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 60 / 24)}d`
  }
  return out
}

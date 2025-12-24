import { describe, it, expect, beforeEach } from 'vitest'
import {
  createCard,
  scheduleAll,
  scheduleNext,
  parseRating,
  fsrsCardToCardRowPatch,
  applyCardRowPatchToFsrsCard,
  gradeToFsrsRatingString,
  FSRSCard,
  FSRSRating,
} from './fsrs'
import { Rating, Grade, State } from 'ts-fsrs'

describe('FSRS simple scheduler', () => {
  let card: FSRSCard
  const now = new Date()

  beforeEach(() => {
    card = createCard(now)
  })

  it('should create a new card with default values', () => {
    expect(card.due).toEqual(now)
    expect(card.stability).toBe(0)
    expect(card.difficulty).toBe(0)
    expect(card.state).toBe(State.New)
  })

  it('should schedule a new card for all ratings', () => {
    const schedules = scheduleAll(card, now)

    expect(schedules).toHaveProperty(String(Rating.Again))
    expect(schedules).toHaveProperty(String(Rating.Hard))
    expect(schedules).toHaveProperty(String(Rating.Good))
    expect(schedules).toHaveProperty(String(Rating.Easy))

    const goodSchedule = schedules[Rating.Good]
    expect(goodSchedule.card.state).toBe(State.Learning)
    expect(goodSchedule.card.due > now).toBe(true)
  })

  it('should schedule the next state for a specific rating', () => {
    const next = scheduleNext(card, Rating.Good as Grade, now)

    expect(next.card.state).toBe(State.Learning)
    expect(next.card.reps).toBe(1)
    expect(next.card.due > now).toBe(true)
  })

  it('should parse rating strings correctly', () => {
    expect(parseRating('again')).toBe(Rating.Again as Grade)
    expect(parseRating(' hard ')).toBe(Rating.Hard as Grade)
    expect(parseRating('GOOD')).toBe(Rating.Good as Grade)
    expect(parseRating('Easy')).toBe(Rating.Easy as Grade)
    expect(() => parseRating('invalid')).toThrow('Unsupported rating: invalid')
  })

  it('should convert FSRS card to a database row patch', () => {
    const next = scheduleNext(card, Rating.Good as Grade, now)
    const patch = fsrsCardToCardRowPatch(next.card)

    expect(patch.due).toBe(next.card.due.toISOString())
    expect(patch.stability).toBe(next.card.stability)
    expect(patch.difficulty).toBe(next.card.difficulty)
    expect(patch.state).toBe('learning')
    expect(patch.last_review).toBe(next.card.last_review?.toISOString())
    expect(patch.updated_at).toBeTypeOf('string')
  })

  it('should apply a database row patch to an FSRS card', () => {
    const patch = {
      due: new Date(now.getTime() + 86400000).toISOString(),
      stability: 2.5,
      difficulty: 5,
      state: 'review' as const,
      last_review: now.toISOString(),
      reps: 1,
    }
    const patchedCard = applyCardRowPatchToFsrsCard(card, patch)

    expect(patchedCard.due).toEqual(new Date(patch.due))
    expect(patchedCard.stability).toBe(patch.stability)
    expect(patchedCard.difficulty).toBe(patch.difficulty)
    expect(patchedCard.state).toBe(State.Review)
    expect(patchedCard.last_review).toEqual(new Date(patch.last_review))
    expect(patchedCard.reps).toBe(1)
  })

  it('should map Grade to FSRS rating string', () => {
    expect(gradeToFsrsRatingString(Rating.Again as Grade)).toBe('again')
    expect(gradeToFsrsRatingString(Rating.Hard as Grade)).toBe('hard')
    expect(gradeToFsrsRatingString(Rating.Good as Grade)).toBe('good')
    expect(gradeToFsrsRatingString(Rating.Easy as Grade)).toBe('easy')
    expect(() => gradeToFsrsRatingString(99 as Grade)).toThrow()
  })
})

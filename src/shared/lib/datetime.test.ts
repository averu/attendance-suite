import { describe, expect, it } from 'vitest'
import {
  APP_TIMEZONE,
  diffMinutes,
  formatDate,
  formatTime,
  formatYearMonth,
  thisMonth,
  today,
} from './datetime'

describe('datetime utilities', () => {
  it('APP_TIMEZONE は Asia/Tokyo', () => {
    expect(APP_TIMEZONE).toBe('Asia/Tokyo')
  })

  describe('formatDate (JST)', () => {
    it('UTC 2026-04-27 23:00 は JST 2026-04-28', () => {
      const d = new Date('2026-04-27T23:00:00Z')
      expect(formatDate(d)).toBe('2026-04-28')
    })

    it('UTC 2026-04-28 00:00 は JST 2026-04-28', () => {
      const d = new Date('2026-04-28T00:00:00Z')
      expect(formatDate(d)).toBe('2026-04-28')
    })

    it('UTC 2026-04-27 14:59 は JST 2026-04-27', () => {
      const d = new Date('2026-04-27T14:59:59Z')
      expect(formatDate(d)).toBe('2026-04-27')
    })
  })

  describe('formatYearMonth (JST)', () => {
    it('UTC 2026-04-30 16:00 は JST 2026-05', () => {
      const d = new Date('2026-04-30T16:00:00Z')
      expect(formatYearMonth(d)).toBe('2026-05')
    })
  })

  describe('formatTime (JST)', () => {
    it('UTC 2026-04-28 00:30 は JST 09:30', () => {
      const d = new Date('2026-04-28T00:30:00Z')
      expect(formatTime(d)).toBe('09:30')
    })

    it('正午は 12:00', () => {
      const d = new Date('2026-04-28T03:00:00Z')
      expect(formatTime(d)).toBe('12:00')
    })
  })

  describe('today / thisMonth', () => {
    it('today は YYYY-MM-DD 形式', () => {
      expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
    it('thisMonth は YYYY-MM 形式', () => {
      expect(thisMonth()).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  describe('diffMinutes', () => {
    it('30 分差', () => {
      const start = new Date('2026-04-28T01:00:00Z')
      const end = new Date('2026-04-28T01:30:00Z')
      expect(diffMinutes(start, end)).toBe(30)
    })

    it('end が start より前なら 0 (負にならない)', () => {
      const start = new Date('2026-04-28T02:00:00Z')
      const end = new Date('2026-04-28T01:00:00Z')
      expect(diffMinutes(start, end)).toBe(0)
    })

    it('end が null なら現在時刻基準で正の値', () => {
      const start = new Date(Date.now() - 60_000)
      expect(diffMinutes(start, null)).toBeGreaterThanOrEqual(1)
    })
  })
})

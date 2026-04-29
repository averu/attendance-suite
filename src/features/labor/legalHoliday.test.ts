import { describe, it, expect } from 'vitest'
import { isLegalHoliday, jstDayOfWeek } from './legalHoliday'

const D = (s: string) => new Date(s)

describe('jstDayOfWeek', () => {
  // 2026-04-29 (水) JST = 2026-04-29 00:00 JST = 2026-04-28 15:00 UTC
  it('JST 0:00 ぴったり (UTC 前日 15:00)', () => {
    expect(jstDayOfWeek(D('2026-04-28T15:00:00Z'))).toBe(3) // Wednesday
  })

  it('日曜日', () => {
    // 2026-04-26 (日) JST = 2026-04-25 15:00 UTC
    expect(jstDayOfWeek(D('2026-04-25T15:00:00Z'))).toBe(0)
  })

  it('土曜日', () => {
    // 2026-04-25 (土) JST
    expect(jstDayOfWeek(D('2026-04-24T15:00:00Z'))).toBe(6)
  })

  it('JST 23:59 でも同じ曜日 (UTC 14:59 翌)', () => {
    // 2026-04-29 23:59 JST = 2026-04-29 14:59 UTC、依然 Wed
    expect(jstDayOfWeek(D('2026-04-29T14:59:59Z'))).toBe(3)
  })

  it('JST 翌日 0:00 跨ぎで曜日が進む', () => {
    // 2026-04-29 23:59:59 JST = 2026-04-29 14:59:59 UTC (Wed)
    // 2026-04-30 00:00:00 JST = 2026-04-29 15:00:00 UTC (Thu)
    expect(jstDayOfWeek(D('2026-04-29T14:59:59Z'))).toBe(3)
    expect(jstDayOfWeek(D('2026-04-29T15:00:00Z'))).toBe(4)
  })
})

describe('isLegalHoliday', () => {
  const policy = { legalHolidayDow: 0 } // Sunday

  it('日曜日は法定休日', () => {
    expect(isLegalHoliday(D('2026-04-25T15:00:00Z'), policy)).toBe(true) // 4/26 Sun JST
  })

  it('月曜日は法定休日でない', () => {
    expect(isLegalHoliday(D('2026-04-26T15:00:00Z'), policy)).toBe(false) // 4/27 Mon JST
  })

  it('policy を変更すると別曜日が法定休日になる (土曜)', () => {
    expect(
      isLegalHoliday(D('2026-04-24T15:00:00Z'), { legalHolidayDow: 6 }),
    ).toBe(true) // 4/25 Sat JST
  })
})

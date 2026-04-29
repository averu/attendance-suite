import { describe, it, expect } from 'vitest'
import {
  addMonthsYMD,
  addYearsYMD,
  compareYMD,
  formatYMD,
  parseYMD,
} from './dateMath'

describe('parseYMD / formatYMD', () => {
  it('正常な YYYY-MM-DD', () => {
    expect(parseYMD('2026-04-29')).toEqual([2026, 4, 29])
    expect(formatYMD(2026, 4, 29)).toBe('2026-04-29')
  })

  it('1 桁月日は zero-pad', () => {
    expect(formatYMD(2026, 1, 5)).toBe('2026-01-05')
  })

  it('不正な形式は throw', () => {
    expect(() => parseYMD('2026-4-29')).toThrow()
    expect(() => parseYMD('2026/04/29')).toThrow()
  })
})

describe('addMonthsYMD', () => {
  it('単純加算', () => {
    expect(addMonthsYMD('2026-04-15', 6)).toBe('2026-10-15')
  })

  it('年跨ぎ', () => {
    expect(addMonthsYMD('2026-09-15', 6)).toBe('2027-03-15')
  })

  it('月末クランプ (8/31 + 6m → 2/28)', () => {
    expect(addMonthsYMD('2025-08-31', 6)).toBe('2026-02-28')
  })

  it('月末クランプ (うるう年: 2024/8/31 + 6m → 2025/2/28)', () => {
    expect(addMonthsYMD('2024-08-31', 6)).toBe('2025-02-28')
  })

  it('月末クランプ (2027/2/29 にはならない)', () => {
    expect(addMonthsYMD('2026-08-29', 6)).toBe('2027-02-28')
  })

  it('負の months', () => {
    expect(addMonthsYMD('2026-04-15', -3)).toBe('2026-01-15')
    expect(addMonthsYMD('2026-01-15', -1)).toBe('2025-12-15')
  })

  it('0 ヶ月は元の日付', () => {
    expect(addMonthsYMD('2026-04-29', 0)).toBe('2026-04-29')
  })
})

describe('addYearsYMD', () => {
  it('1 年加算', () => {
    expect(addYearsYMD('2026-04-29', 1)).toBe('2027-04-29')
  })

  it('うるう年 2/29 → 翌年 2/28', () => {
    expect(addYearsYMD('2024-02-29', 1)).toBe('2025-02-28')
  })

  it('2 年加算でうるう年に再到達', () => {
    expect(addYearsYMD('2024-02-29', 4)).toBe('2028-02-29')
  })
})

describe('compareYMD', () => {
  it('文字列比較で順序が保てる', () => {
    expect(compareYMD('2026-04-29', '2026-04-30')).toBeLessThan(0)
    expect(compareYMD('2026-04-29', '2026-04-29')).toBe(0)
    expect(compareYMD('2026-04-30', '2026-04-29')).toBeGreaterThan(0)
  })
})

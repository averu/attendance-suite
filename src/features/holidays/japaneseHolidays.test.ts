import { describe, it, expect } from 'vitest'
import { generateJapaneseHolidays } from './japaneseHolidays'

describe('generateJapaneseHolidays', () => {
  it('2024 年: 主要祝日と振替が出る', () => {
    const r = generateJapaneseHolidays(2024)
    const names = r.map((h) => h.name)
    expect(names).toContain('元日')
    expect(names).toContain('成人の日')
    expect(names).toContain('建国記念の日')
    expect(names).toContain('春分の日')
    expect(names).toContain('秋分の日')
    expect(names).toContain('振替休日')
    expect(r.find((h) => h.name === '元日')?.date).toBe('2024-01-01')
  })

  it('成人の日 = 1 月の第 2 月曜', () => {
    expect(
      generateJapaneseHolidays(2024).find((h) => h.name === '成人の日')?.date,
    ).toBe('2024-01-08') // 月曜
    expect(
      generateJapaneseHolidays(2026).find((h) => h.name === '成人の日')?.date,
    ).toBe('2026-01-12')
  })

  it('海の日 = 7 月の第 3 月曜', () => {
    expect(
      generateJapaneseHolidays(2024).find((h) => h.name === '海の日')?.date,
    ).toBe('2024-07-15')
    expect(
      generateJapaneseHolidays(2026).find((h) => h.name === '海の日')?.date,
    ).toBe('2026-07-20')
  })

  it('春分の日 / 秋分の日', () => {
    // 2024: 春分 3/20, 秋分 9/22 → 22日が日曜なので振替 9/23
    const r = generateJapaneseHolidays(2024)
    expect(r.find((h) => h.name === '春分の日')?.date).toBe('2024-03-20')
    expect(r.find((h) => h.name === '秋分の日')?.date).toBe('2024-09-22')
    // 2026: 春分 3/20, 秋分 9/23
    const r2 = generateJapaneseHolidays(2026)
    expect(r2.find((h) => h.name === '春分の日')?.date).toBe('2026-03-20')
    expect(r2.find((h) => h.name === '秋分の日')?.date).toBe('2026-09-23')
  })

  it('日曜祝日の翌平日が振替休日になる (2024 年こどもの日 5/5 日曜)', () => {
    const r = generateJapaneseHolidays(2024)
    const subs = r.filter((h) => h.name === '振替休日').map((h) => h.date)
    // 5/5 が日曜なので 5/6 が振替
    expect(subs).toContain('2024-05-06')
  })

  it('結果は date 昇順', () => {
    const r = generateJapaneseHolidays(2025)
    const dates = r.map((h) => h.date)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })

  it('元日 1/1 が日曜の年は 1/2 が振替休日 (2023 年)', () => {
    const r = generateJapaneseHolidays(2023)
    expect(r.find((h) => h.date === '2023-01-02')?.name).toBe('振替休日')
  })
})

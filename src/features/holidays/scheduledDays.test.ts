import { describe, expect, it } from 'vitest'
import { scheduledWorkingDays } from './scheduledDays'

describe('scheduledWorkingDays', () => {
  it('2026-04 (祝日なし) → 平日のみ 22 日', () => {
    // 2026-04-01 (Wed) ... 2026-04-30 (Thu)
    // 土日: 4,5,11,12,18,19,25,26 (8 日)
    // 平日: 30 - 8 = 22
    expect(scheduledWorkingDays('2026-04', [])).toBe(22)
  })

  it('祝日を 1 日加えると 1 日減る', () => {
    expect(scheduledWorkingDays('2026-04', ['2026-04-29'])).toBe(21)
  })

  it('土日に祝日があっても二重カウントしない', () => {
    // 2026-04-25 は土曜
    expect(scheduledWorkingDays('2026-04', ['2026-04-25'])).toBe(22)
  })

  it('別月の祝日は無視', () => {
    expect(
      scheduledWorkingDays('2026-04', ['2026-05-03', '2026-04-29']),
    ).toBe(21)
  })

  it('重複した祝日でも 1 日としてカウント', () => {
    expect(
      scheduledWorkingDays('2026-04', ['2026-04-29', '2026-04-29']),
    ).toBe(21)
  })

  it('全平日が祝日なら 0', () => {
    const days: string[] = []
    for (let d = 1; d <= 30; d++) {
      const day = d < 10 ? `0${d}` : String(d)
      days.push(`2026-04-${day}`)
    }
    expect(scheduledWorkingDays('2026-04', days)).toBe(0)
  })

  it('2 月 (28 日)', () => {
    // 2026-02-01 (Sun) ... 2026-02-28 (Sat)
    // 平日: 月〜金 = 20 日
    expect(scheduledWorkingDays('2026-02', [])).toBe(20)
  })

  it('1 月 (31 日)', () => {
    // 2026-01-01 (Thu) ... 2026-01-31 (Sat)
    // 平日: 22 日
    expect(scheduledWorkingDays('2026-01', [])).toBe(22)
  })
})

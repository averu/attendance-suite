import { describe, it, expect } from 'vitest'
import {
  computeWeeklyBreakdown,
  LEGAL_WEEKLY_LIMIT_MINUTES,
} from './weeklyOvertime'

describe('computeWeeklyBreakdown', () => {
  it('LEGAL_WEEKLY_LIMIT_MINUTES === 2400 (40h)', () => {
    expect(LEGAL_WEEKLY_LIMIT_MINUTES).toBe(2400)
  })

  it('週合計 40h ちょうど → 法定外 0', () => {
    const r = computeWeeklyBreakdown([480, 480, 480, 480, 480, 0, 0], [0, 0, 0, 0, 0, 0, 0])
    expect(r.totalWorkedMinutes).toBe(2400)
    expect(r.weeklyOnlyLegalOvertimeMinutes).toBe(0)
    expect(r.totalLegalOvertimeMinutes).toBe(0)
  })

  it('9h × 5 日 (45h): 日次法定外 5h、週合計超過分は重複なので weeklyOnly 0', () => {
    const daily = [540, 540, 540, 540, 540, 0, 0]
    const dailyOT = daily.map((m) => Math.max(0, m - 480))
    const r = computeWeeklyBreakdown(daily, dailyOT)
    expect(r.totalWorkedMinutes).toBe(2700)
    expect(r.dailyLegalOvertimeSumMinutes).toBe(300)
    expect(r.weeklyOnlyLegalOvertimeMinutes).toBe(0)
    expect(r.totalLegalOvertimeMinutes).toBe(300)
  })

  it('7h × 6 日 (42h): 日次は 8h 超なし、週次のみ 2h', () => {
    const daily = [420, 420, 420, 420, 420, 420, 0]
    const dailyOT = daily.map((m) => Math.max(0, m - 480))
    const r = computeWeeklyBreakdown(daily, dailyOT)
    expect(r.totalWorkedMinutes).toBe(2520)
    expect(r.dailyLegalOvertimeSumMinutes).toBe(0)
    expect(r.weeklyOnlyLegalOvertimeMinutes).toBe(120)
    expect(r.totalLegalOvertimeMinutes).toBe(120)
  })

  it('10h × 4 日 + 6h × 1 日 (46h): 日次 8h、週次は重複 (6h<8h) で 0 → total 8h', () => {
    const daily = [600, 600, 600, 600, 360, 0, 0]
    const dailyOT = daily.map((m) => Math.max(0, m - 480))
    const r = computeWeeklyBreakdown(daily, dailyOT)
    expect(r.totalWorkedMinutes).toBe(2760)
    expect(r.dailyLegalOvertimeSumMinutes).toBe(480)
    expect(r.weeklyOnlyLegalOvertimeMinutes).toBe(0)
    expect(r.totalLegalOvertimeMinutes).toBe(480)
  })

  it('週合計 < 40h → 法定外 0', () => {
    const daily = [300, 300, 300, 300, 0, 0, 0]
    const r = computeWeeklyBreakdown(daily, [0, 0, 0, 0, 0, 0, 0])
    expect(r.totalLegalOvertimeMinutes).toBe(0)
  })

  it('特例措置: 週上限 44h (44 * 60 = 2640) を渡した場合', () => {
    const daily = [480, 480, 480, 480, 480, 480, 0] // 48h
    const dailyOT = [0, 0, 0, 0, 0, 0, 0] // すべて 8h ぴったりで日次 OT なし
    const r = computeWeeklyBreakdown(daily, dailyOT, 2640)
    // 48h - 44h = 4h
    expect(r.totalLegalOvertimeMinutes).toBe(4 * 60)
  })

  it('負の入力は 0 として扱う (-100 はクランプ後 0、残り 4 日 × 480 で 1920)', () => {
    const r = computeWeeklyBreakdown([-100, 480, 480, 480, 480, 0, 0], [0, 0, 0, 0, 0, 0, 0])
    expect(r.totalWorkedMinutes).toBe(1920)
  })

  it('日次配列と OT 配列の長さが異なる場合は単純に reduce する (呼び出し側責務)', () => {
    // 日次は短いが、関数は配列長を強制しない。これは仕様。
    const r = computeWeeklyBreakdown([600], [120])
    expect(r.totalWorkedMinutes).toBe(600)
    expect(r.dailyLegalOvertimeSumMinutes).toBe(120)
    // 週合計 600 < 40h なので weeklyOnly=0、total = daily
    expect(r.totalLegalOvertimeMinutes).toBe(120)
  })
})

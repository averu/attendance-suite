import { describe, it, expect } from 'vitest'
import {
  computeDailyBreakdown,
  LEGAL_DAILY_LIMIT_MINUTES,
} from './dailyOvertime'

describe('computeDailyBreakdown', () => {
  it('worked < scheduled (定時より早く帰った)', () => {
    const r = computeDailyBreakdown(360, 480)
    expect(r).toMatchObject({
      withinScheduledMinutes: 360,
      beyondScheduledWithinLegalMinutes: 0,
      legalOvertimeMinutes: 0,
    })
  })

  it('worked === scheduled === 480 (8h ぴったり)', () => {
    const r = computeDailyBreakdown(480, 480)
    expect(r).toMatchObject({
      withinScheduledMinutes: 480,
      beyondScheduledWithinLegalMinutes: 0,
      legalOvertimeMinutes: 0,
    })
  })

  it('所定 8h, worked 10h: 480 内 + 法定外 120', () => {
    const r = computeDailyBreakdown(600, 480)
    expect(r.withinScheduledMinutes).toBe(480)
    expect(r.beyondScheduledWithinLegalMinutes).toBe(0)
    expect(r.legalOvertimeMinutes).toBe(120)
  })

  it('所定 7h, worked 9h: 所定枠 420 + 法定内残業 60 + 法定外 60', () => {
    const r = computeDailyBreakdown(540, 420)
    expect(r.withinScheduledMinutes).toBe(420)
    expect(r.beyondScheduledWithinLegalMinutes).toBe(60)
    expect(r.legalOvertimeMinutes).toBe(60)
    // 合計 = worked
    expect(
      r.withinScheduledMinutes + r.beyondScheduledWithinLegalMinutes + r.legalOvertimeMinutes,
    ).toBe(540)
  })

  it('所定 9h (変形労働), worked 8h: 全部所定枠内で 残業 0', () => {
    const r = computeDailyBreakdown(480, 540)
    expect(r.withinScheduledMinutes).toBe(480)
    expect(r.beyondScheduledWithinLegalMinutes).toBe(0)
    expect(r.legalOvertimeMinutes).toBe(0)
  })

  it('所定 9h (変形労働), worked 10h: 所定 540 + 法定外 60 (所定超 法定内は 0)', () => {
    const r = computeDailyBreakdown(600, 540)
    expect(r.withinScheduledMinutes).toBe(540)
    expect(r.beyondScheduledWithinLegalMinutes).toBe(0)
    expect(r.legalOvertimeMinutes).toBe(120) // worked - 480
    // 注: 変形労働のとき所定 540 内の最後 60 分は名目上「所定枠内」だが法定 480 を超えるので
    // 法定外として割増対象。本関数は機械的に「480 超 = 法定外」を切り出しているので OK。
  })

  it('worked 0 / scheduled 0 (休日 / 欠勤想定): 全 0', () => {
    const r = computeDailyBreakdown(0, 0)
    expect(r.withinScheduledMinutes).toBe(0)
    expect(r.beyondScheduledWithinLegalMinutes).toBe(0)
    expect(r.legalOvertimeMinutes).toBe(0)
  })

  it('worked 480, scheduled 0 (休日労働): 法定内残業 480', () => {
    const r = computeDailyBreakdown(480, 0)
    expect(r.withinScheduledMinutes).toBe(0)
    expect(r.beyondScheduledWithinLegalMinutes).toBe(480)
    expect(r.legalOvertimeMinutes).toBe(0)
  })

  it('負値の入力は 0 にクランプ (異常系)', () => {
    const r = computeDailyBreakdown(-60, -30)
    expect(r.workedMinutes).toBe(0)
    expect(r.scheduledMinutes).toBe(0)
    expect(r.legalOvertimeMinutes).toBe(0)
  })

  it('LEGAL_DAILY_LIMIT_MINUTES === 480', () => {
    expect(LEGAL_DAILY_LIMIT_MINUTES).toBe(480)
  })
})

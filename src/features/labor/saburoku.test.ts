import { describe, it, expect } from 'vitest'
import {
  assessSaburokuMonth,
  assessSaburokuYear,
  computeRollingAverages,
  SABUROKU_MONTHLY_LIMIT_MINUTES,
  SABUROKU_ANNUAL_LIMIT_MINUTES,
  SABUROKU_SPECIAL_ANNUAL_LIMIT_MINUTES,
  SABUROKU_SPECIAL_MONTHLY_HARD_LIMIT_MINUTES,
  SABUROKU_SPECIAL_ROLLING_AVG_LIMIT_MINUTES,
  SABUROKU_SPECIAL_INVOCATION_LIMIT,
} from './saburoku'

describe('定数', () => {
  it('労基法 36 条の最低限を満たす', () => {
    expect(SABUROKU_MONTHLY_LIMIT_MINUTES).toBe(45 * 60)
    expect(SABUROKU_ANNUAL_LIMIT_MINUTES).toBe(360 * 60)
    expect(SABUROKU_SPECIAL_MONTHLY_HARD_LIMIT_MINUTES).toBe(100 * 60)
    expect(SABUROKU_SPECIAL_ANNUAL_LIMIT_MINUTES).toBe(720 * 60)
    expect(SABUROKU_SPECIAL_ROLLING_AVG_LIMIT_MINUTES).toBe(80 * 60)
    expect(SABUROKU_SPECIAL_INVOCATION_LIMIT).toBe(6)
  })
})

describe('assessSaburokuMonth', () => {
  it('45h ぴったり → 45h 超ではない', () => {
    const r = assessSaburokuMonth({
      yearMonth: '2026-04',
      legalOvertimeMinutes: 45 * 60,
      legalHolidayWorkedMinutes: 0,
    })
    expect(r.exceedsMonthly45h).toBe(false)
  })

  it('45h を 1 分超えると 45h 超', () => {
    const r = assessSaburokuMonth({
      yearMonth: '2026-04',
      legalOvertimeMinutes: 45 * 60 + 1,
      legalHolidayWorkedMinutes: 0,
    })
    expect(r.exceedsMonthly45h).toBe(true)
  })

  it('100h ちょうど (合計) → exceeds (「100h 未満」なので)', () => {
    const r = assessSaburokuMonth({
      yearMonth: '2026-04',
      legalOvertimeMinutes: 80 * 60,
      legalHolidayWorkedMinutes: 20 * 60,
    })
    expect(r.legalOvertimePlusHolidayMinutes).toBe(100 * 60)
    expect(r.exceedsMonthly100h).toBe(true)
  })

  it('99h59min → not exceeds 100h', () => {
    const r = assessSaburokuMonth({
      yearMonth: '2026-04',
      legalOvertimeMinutes: 99 * 60 + 59,
      legalHolidayWorkedMinutes: 0,
    })
    expect(r.exceedsMonthly100h).toBe(false)
  })

  it('合計 = 法定外残業 + 法定休日労働', () => {
    const r = assessSaburokuMonth({
      yearMonth: '2026-04',
      legalOvertimeMinutes: 30 * 60,
      legalHolidayWorkedMinutes: 16 * 60,
    })
    expect(r.legalOvertimePlusHolidayMinutes).toBe(46 * 60)
  })

  it('負の入力は 0 にクランプ', () => {
    const r = assessSaburokuMonth({
      yearMonth: '2026-04',
      legalOvertimeMinutes: -10,
      legalHolidayWorkedMinutes: -5,
    })
    expect(r.legalOvertimeMinutes).toBe(0)
    expect(r.legalHolidayWorkedMinutes).toBe(0)
  })
})

describe('computeRollingAverages', () => {
  it('1 ヶ月のみ → 空 (2 ヶ月以上の窓が必要)', () => {
    expect(
      computeRollingAverages([
        { yearMonth: '2026-04', legalOvertimeMinutes: 50 * 60, legalHolidayWorkedMinutes: 0 },
      ]),
    ).toEqual([])
  })

  it('2 ヶ月平均: 80h と 80h → 平均 80h ぴったり (NG ではない)', () => {
    const r = computeRollingAverages([
      { yearMonth: '2026-04', legalOvertimeMinutes: 80 * 60, legalHolidayWorkedMinutes: 0 },
      { yearMonth: '2026-05', legalOvertimeMinutes: 80 * 60, legalHolidayWorkedMinutes: 0 },
    ])
    const w = r.find((x) => x.monthsCount === 2)
    expect(w?.averageMinutes).toBe(80 * 60)
    expect(w?.exceeds80h).toBe(false)
  })

  it('2 ヶ月平均: 90h と 80h → 平均 85h (NG)', () => {
    const r = computeRollingAverages([
      { yearMonth: '2026-04', legalOvertimeMinutes: 90 * 60, legalHolidayWorkedMinutes: 0 },
      { yearMonth: '2026-05', legalOvertimeMinutes: 80 * 60, legalHolidayWorkedMinutes: 0 },
    ])
    const w = r.find((x) => x.monthsCount === 2)
    expect(w?.averageMinutes).toBe(85 * 60)
    expect(w?.exceeds80h).toBe(true)
  })

  it('6 ヶ月: 各サイズ 2,3,4,5,6 のスライディングウィンドウすべてを生成', () => {
    const months = Array.from({ length: 6 }, (_, i) => ({
      yearMonth: `2026-0${i + 1}`,
      legalOvertimeMinutes: 60 * 60,
      legalHolidayWorkedMinutes: 0,
    }))
    const r = computeRollingAverages(months)
    // k=2: 5 windows, k=3: 4, k=4: 3, k=5: 2, k=6: 1 → 計 15
    expect(r.length).toBe(15)
  })

  it('入力順がランダムでも yearMonth 昇順で計算', () => {
    const r = computeRollingAverages([
      { yearMonth: '2026-05', legalOvertimeMinutes: 90 * 60, legalHolidayWorkedMinutes: 0 },
      { yearMonth: '2026-04', legalOvertimeMinutes: 70 * 60, legalHolidayWorkedMinutes: 0 },
    ])
    const w = r[0]!
    expect(w.startYearMonth).toBe('2026-04')
    expect(w.endYearMonth).toBe('2026-05')
    expect(w.averageMinutes).toBe(80 * 60)
  })

  it('法定休日労働が平均に含まれる', () => {
    const r = computeRollingAverages([
      { yearMonth: '2026-04', legalOvertimeMinutes: 60 * 60, legalHolidayWorkedMinutes: 30 * 60 },
      { yearMonth: '2026-05', legalOvertimeMinutes: 60 * 60, legalHolidayWorkedMinutes: 30 * 60 },
    ])
    // 各月 90h 合計、平均 90h → 80h 超
    expect(r[0]!.averageMinutes).toBe(90 * 60)
    expect(r[0]!.exceeds80h).toBe(true)
  })
})

describe('assessSaburokuYear', () => {
  it('全月 30h ずつ × 12 ヶ月 = 年 360h ぴったり: 360h 超ではない', () => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      yearMonth: `2026-${String(i + 1).padStart(2, '0')}`,
      legalOvertimeMinutes: 30 * 60,
      legalHolidayWorkedMinutes: 0,
    }))
    const r = assessSaburokuYear(months)
    expect(r.annualLegalOvertimeMinutes).toBe(360 * 60)
    expect(r.exceedsAnnual360h).toBe(false)
    expect(r.specialClauseInvocationCount).toBe(0)
  })

  it('年合計 720h 超 → exceedsAnnual720h', () => {
    const months = Array.from({ length: 12 }, () => ({
      yearMonth: '',
      legalOvertimeMinutes: 70 * 60, // 12 * 70 = 840h
      legalHolidayWorkedMinutes: 0,
    })).map((m, i) => ({
      ...m,
      yearMonth: `2026-${String(i + 1).padStart(2, '0')}`,
    }))
    const r = assessSaburokuYear(months)
    expect(r.annualLegalOvertimeMinutes).toBe(840 * 60)
    expect(r.exceedsAnnual720h).toBe(true)
  })

  it('特別条項発動回数 (45h 超月数)', () => {
    // 7 ヶ月だけ 50h、残り 30h
    const months = Array.from({ length: 12 }, (_, i) => ({
      yearMonth: `2026-${String(i + 1).padStart(2, '0')}`,
      legalOvertimeMinutes: i < 7 ? 50 * 60 : 30 * 60,
      legalHolidayWorkedMinutes: 0,
    }))
    const r = assessSaburokuYear(months)
    expect(r.specialClauseInvocationCount).toBe(7)
    expect(r.exceedsSpecialClauseInvocationLimit).toBe(true)
  })

  it('特別条項発動 6 回はギリ OK、7 回で NG', () => {
    const make = (over: number) =>
      Array.from({ length: 12 }, (_, i) => ({
        yearMonth: `2026-${String(i + 1).padStart(2, '0')}`,
        legalOvertimeMinutes: i < over ? 50 * 60 : 30 * 60,
        legalHolidayWorkedMinutes: 0,
      }))
    expect(assessSaburokuYear(make(6)).exceedsSpecialClauseInvocationLimit).toBe(false)
    expect(assessSaburokuYear(make(7)).exceedsSpecialClauseInvocationLimit).toBe(true)
  })

  it('複数月平均 80h 超があれば exceedsRollingAverage80h', () => {
    const months = [
      { yearMonth: '2026-01', legalOvertimeMinutes: 100 * 60, legalHolidayWorkedMinutes: 0 },
      { yearMonth: '2026-02', legalOvertimeMinutes: 70 * 60, legalHolidayWorkedMinutes: 0 },
    ]
    const r = assessSaburokuYear(months)
    // 2 ヶ月平均 = 85h → NG
    expect(r.exceedsRollingAverage80h).toBe(true)
  })

  it('1 ヶ月 100h 以上の月があると monthlyFindings に exceedsMonthly100h=true が出る', () => {
    const months = [
      { yearMonth: '2026-04', legalOvertimeMinutes: 90 * 60, legalHolidayWorkedMinutes: 10 * 60 }, // 合計 100h
    ]
    const r = assessSaburokuYear(months)
    expect(r.monthlyFindings[0]?.exceedsMonthly100h).toBe(true)
  })
})

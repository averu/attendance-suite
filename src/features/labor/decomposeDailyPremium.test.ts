import { describe, it, expect } from 'vitest'
import { decomposeDailyPremium } from './decomposeDailyPremium'
import type { TimeRange } from './types'

const D = (s: string) => new Date(s)
const seg = (start: string, end: string): TimeRange => ({
  start: D(start),
  end: D(end),
})

// JST = UTC+9。22:00 JST = 13:00 UTC、05:00 JST = 20:00 UTC (前日)。

describe('decomposeDailyPremium — 平日昼間', () => {
  it('8h 以内 (9-17 JST = 00-08 UTC) → withinLegalDaytime のみ', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T08:00:00Z')],
      false,
      0,
    )
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(480)
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
  })

  it('10h 平日: 8h withinLegal + 2h legalOvertimeUnder60Daytime', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')],
      false,
      0,
    )
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(480)
    expect(r.decomposition.legalOvertimeUnder60DaytimeMinutes).toBe(120)
    expect(r.decomposition.legalOvertimeUnder60NightMinutes).toBe(0)
    expect(r.dailyLegalOvertimeMinutes).toBe(120)
  })

  it('8h ぴったり: legalOvertime は 0', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T08:00:00Z')],
      false,
      0,
    )
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(480)
  })
})

describe('decomposeDailyPremium — 深夜帯あり', () => {
  it('14:00-23:00 JST (5h-14h UTC) = 9h 労働: 8h withinLegal + 1h legalOT、最後 1h は深夜', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T05:00:00Z', '2026-04-29T14:00:00Z')], // 14:00-23:00 JST
      false,
      0,
    )
    // 14:00-22:00 JST = 8h 昼間 → withinLegalDaytime 480
    // 22:00-23:00 JST = 1h 深夜 → 8h 超分なので legalOvertimeUnder60Night 60
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(480)
    expect(r.decomposition.legalOvertimeUnder60NightMinutes).toBe(60)
    expect(r.decomposition.legalOvertimeUnder60DaytimeMinutes).toBe(0)
    expect(r.dailyLegalOvertimeMinutes).toBe(60)
  })

  it('深夜帯と所定 8h 内が両方 (例: 17:00-翌2:00 JST = 9h 中の最後 4h が深夜)', () => {
    // 17:00 JST = 08:00 UTC、翌 02:00 JST = 17:00 UTC
    const r = decomposeDailyPremium(
      [seg('2026-04-29T08:00:00Z', '2026-04-29T17:00:00Z')],
      false,
      0,
    )
    // 17:00-22:00 JST = 5h 昼間 → withinLegalDaytime 300
    // 22:00-翌01:00 JST = 3h 深夜 → withinLegalNight 180 (=8h まで埋まる)
    // 翌01:00-翌02:00 JST = 1h 深夜 (8h 超) → legalOvertimeUnder60Night 60
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(300)
    expect(r.decomposition.withinLegalNightMinutes).toBe(180)
    expect(r.decomposition.legalOvertimeUnder60NightMinutes).toBe(60)
    expect(r.dailyLegalOvertimeMinutes).toBe(60)
  })
})

describe('decomposeDailyPremium — 月 60h 超', () => {
  it('carryIn が 60h ちょうど: 当日 OT は全部 over60', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')], // 10h 労働
      false,
      60 * 60, // 60h カリーイン
    )
    expect(r.decomposition.legalOvertimeUnder60DaytimeMinutes).toBe(0)
    expect(r.decomposition.legalOvertimeOver60DaytimeMinutes).toBe(120)
  })

  it('carryIn 59h 30min: 当日 OT 2h のうち 30min が under60、90min が over60', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')],
      false,
      59 * 60 + 30,
    )
    expect(r.decomposition.legalOvertimeUnder60DaytimeMinutes).toBe(30)
    expect(r.decomposition.legalOvertimeOver60DaytimeMinutes).toBe(90)
    expect(r.dailyLegalOvertimeMinutes).toBe(120)
  })
})

describe('decomposeDailyPremium — 法定休日', () => {
  it('法定休日 8h 労働 (昼間): legalHolidayDaytime 480、legalOT は 0', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T08:00:00Z')],
      true,
      0,
    )
    expect(r.decomposition.legalHolidayDaytimeMinutes).toBe(480)
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(0)
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
  })

  it('法定休日 22:00-23:00 JST: legalHolidayNight 60', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T13:00:00Z', '2026-04-29T14:00:00Z')], // 22-23 JST
      true,
      0,
    )
    expect(r.decomposition.legalHolidayNightMinutes).toBe(60)
    expect(r.decomposition.legalHolidayDaytimeMinutes).toBe(0)
  })

  it('法定休日 10h でも legalOvertime には積まない (35% は別建て)', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')],
      true,
      0,
    )
    expect(r.decomposition.legalHolidayDaytimeMinutes).toBe(600)
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
  })
})

describe('decomposeDailyPremium — 管理監督者 (manager)', () => {
  it('manager は 10h 平日でも 法定外残業 0、全部 within に集計される', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')], // 9-19 JST = 10h
      false,
      0,
      'manager',
    )
    expect(r.decomposition.legalOvertimeUnder60DaytimeMinutes).toBe(0)
    expect(r.decomposition.legalOvertimeOver60DaytimeMinutes).toBe(0)
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(600)
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
  })

  it('manager は法定休日労働でも legalHoliday バケットに行かず within に集計', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T08:00:00Z')],
      true,
      0,
      'manager',
    )
    expect(r.decomposition.legalHolidayDaytimeMinutes).toBe(0)
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(480)
  })

  it('manager の深夜は withinLegalNight に集計 (深夜割増 25% 適用)', () => {
    // 14-24 JST = 05-15 UTC = 10h、うち 22-24 JST = 13-15 UTC が深夜帯 2h
    const r = decomposeDailyPremium(
      [seg('2026-04-29T05:00:00Z', '2026-04-29T15:00:00Z')],
      false,
      0,
      'manager',
    )
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(8 * 60)
    expect(r.decomposition.withinLegalNightMinutes).toBe(2 * 60)
    expect(r.decomposition.legalOvertimeUnder60NightMinutes).toBe(0)
  })

  it('manager は carryIn=60h でも over60h バケットを使わない', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')],
      false,
      59 * 60 + 30,
      'manager',
    )
    expect(r.decomposition.legalOvertimeOver60DaytimeMinutes).toBe(0)
    expect(r.decomposition.legalOvertimeUnder60DaytimeMinutes).toBe(0)
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(600)
  })
})

describe('decomposeDailyPremium — 高度プロフェッショナル (highly_skilled)', () => {
  it('深夜帯を含む 10h でも全バケット 0', () => {
    // 14-24 JST: 22-24 JST が深夜帯 2h
    const r = decomposeDailyPremium(
      [seg('2026-04-29T05:00:00Z', '2026-04-29T15:00:00Z')],
      false,
      0,
      'highly_skilled',
    )
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
    expect(Object.values(r.decomposition).every((v) => v === 0)).toBe(true)
  })

  it('法定休日労働でも全バケット 0', () => {
    const r = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T08:00:00Z')],
      true,
      0,
      'highly_skilled',
    )
    expect(Object.values(r.decomposition).every((v) => v === 0)).toBe(true)
  })
})

describe('decomposeDailyPremium — 裁量労働制 (discretionary)', () => {
  it('現実装は general と同等の集計 (みなし時間カラム未実装のため)', () => {
    const general = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')],
      false,
      0,
      'general',
    )
    const discretionary = decomposeDailyPremium(
      [seg('2026-04-29T00:00:00Z', '2026-04-29T10:00:00Z')],
      false,
      0,
      'discretionary',
    )
    expect(discretionary).toEqual(general)
  })
})

describe('decomposeDailyPremium — エッジ', () => {
  it('空 segments → 全 0', () => {
    const r = decomposeDailyPremium([], false, 0)
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
    expect(Object.values(r.decomposition).every((v) => v === 0)).toBe(true)
  })

  it('複数セグメント (休憩で分かれた) の合計が正しい', () => {
    const r = decomposeDailyPremium(
      [
        seg('2026-04-29T00:00:00Z', '2026-04-29T03:00:00Z'), // 3h 09-12 JST
        seg('2026-04-29T04:00:00Z', '2026-04-29T09:00:00Z'), // 5h 13-18 JST
      ],
      false,
      0,
    )
    // 合計 8h 全部昼間
    expect(r.decomposition.withinLegalDaytimeMinutes).toBe(480)
    expect(r.dailyLegalOvertimeMinutes).toBe(0)
  })
})

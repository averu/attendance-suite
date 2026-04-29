import { describe, it, expect } from 'vitest'
import { nightMinutesInRange, totalNightMinutes } from './nightWork'

const D = (s: string) => new Date(s)

// 参考: JST = UTC+9 (DST なし)。
//   22:00 JST = 13:00 UTC, 5:00 JST = 20:00 UTC (前日)。
//   よって日 d の深夜帯 [22:00 d JST, 05:00 d+1 JST) は UTC では [13:00 d, 20:00 d] (実質 7h)。

describe('nightMinutesInRange', () => {
  it('end <= start は 0', () => {
    expect(
      nightMinutesInRange({ start: D('2026-04-29T13:00:00Z'), end: D('2026-04-29T13:00:00Z') }),
    ).toBe(0)
  })

  it('深夜帯と完全に重ならない (昼間) は 0', () => {
    // 09:00-17:00 JST = 00:00-08:00 UTC。深夜帯にかからない。
    expect(
      nightMinutesInRange({
        start: D('2026-04-29T00:00:00Z'),
        end: D('2026-04-29T08:00:00Z'),
      }),
    ).toBe(0)
  })

  it('22:00-23:00 JST は 60 分 (UTC 13:00-14:00)', () => {
    expect(
      nightMinutesInRange({
        start: D('2026-04-29T13:00:00Z'),
        end: D('2026-04-29T14:00:00Z'),
      }),
    ).toBe(60)
  })

  it('翌 0:00-05:00 JST は 300 分', () => {
    // 翌 0:00 JST = 当日 15:00 UTC、翌 5:00 JST = 当日 20:00 UTC
    expect(
      nightMinutesInRange({
        start: D('2026-04-29T15:00:00Z'),
        end: D('2026-04-29T20:00:00Z'),
      }),
    ).toBe(300)
  })

  it('深夜帯フル (22:00-翌05:00 JST = 7h)', () => {
    // 13:00 UTC d ~ 20:00 UTC d
    expect(
      nightMinutesInRange({
        start: D('2026-04-29T13:00:00Z'),
        end: D('2026-04-29T20:00:00Z'),
      }),
    ).toBe(7 * 60)
  })

  it('深夜帯外で終わる (18:00-23:30 JST = 1.5h 深夜)', () => {
    // 18:00 JST = 09:00 UTC, 23:30 JST = 14:30 UTC
    // 22:00-23:30 JST = 1.5h 深夜
    expect(
      nightMinutesInRange({
        start: D('2026-04-29T09:00:00Z'),
        end: D('2026-04-29T14:30:00Z'),
      }),
    ).toBe(90)
  })

  it('range が深夜帯を完全に包含する場合 (前日 21:00 ~ 翌日 06:00 JST) は 7h', () => {
    // 21:00 JST = 12:00 UTC, 翌 06:00 JST = 21:00 UTC
    expect(
      nightMinutesInRange({
        start: D('2026-04-28T12:00:00Z'),
        end: D('2026-04-28T21:00:00Z'),
      }),
    ).toBe(7 * 60)
  })

  it('複数日跨ぎ (2 夜分の深夜帯) は 14h', () => {
    // 2026-04-28 21:00 JST から 2026-04-30 06:00 JST まで
    // 前夜 22:00-翌5:00 + 翌日 22:00-翌5:00 = 2 * 7h = 14h
    // 21:00 JST = 12:00 UTC (28 日)、06:00 JST = 21:00 UTC (29 日)
    expect(
      nightMinutesInRange({
        start: D('2026-04-28T12:00:00Z'),
        end: D('2026-04-29T21:00:00Z'),
      }),
    ).toBe(14 * 60)
  })

  it('境界値: 22:00 JST ちょうど開始 / 5:00 JST ちょうど終了', () => {
    expect(
      nightMinutesInRange({
        start: D('2026-04-29T13:00:00Z'), // 22:00 JST
        end: D('2026-04-29T20:00:00Z'),   // 翌 05:00 JST
      }),
    ).toBe(7 * 60)
  })
})

describe('totalNightMinutes', () => {
  it('複数 segment の合計', () => {
    expect(
      totalNightMinutes([
        { start: D('2026-04-29T13:00:00Z'), end: D('2026-04-29T14:00:00Z') }, // 60
        { start: D('2026-04-29T15:00:00Z'), end: D('2026-04-29T17:00:00Z') }, // 120
      ]),
    ).toBe(180)
  })

  it('空配列は 0', () => {
    expect(totalNightMinutes([])).toBe(0)
  })
})

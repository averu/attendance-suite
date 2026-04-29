import { describe, expect, it } from 'vitest'
import {
  buildPastDays,
  computeDailyTrend,
  type TrendInputEntry,
} from './recentTrend'

describe('buildPastDays', () => {
  it('anchor を含む 7 日 (古い順)', () => {
    expect(buildPastDays('2026-04-29', 7)).toEqual([
      '2026-04-23',
      '2026-04-24',
      '2026-04-25',
      '2026-04-26',
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
    ])
  })

  it('1 日のみ', () => {
    expect(buildPastDays('2026-04-29', 1)).toEqual(['2026-04-29'])
  })

  it('月またぎ (4/3 を anchor で 7 日)', () => {
    expect(buildPastDays('2026-04-03', 7)).toEqual([
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ])
  })
})

describe('computeDailyTrend', () => {
  const fixedNow = new Date('2026-04-29T10:00:00Z')

  function entry(
    workDate: string,
    clockInISO: string | null,
    clockOutISO: string | null,
  ): TrendInputEntry {
    return {
      workDate,
      clockInAt: clockInISO ? new Date(clockInISO) : null,
      clockOutAt: clockOutISO ? new Date(clockOutISO) : null,
    }
  }

  it('対象日内に entry なし → 全 0', () => {
    const r = computeDailyTrend(
      ['2026-04-28', '2026-04-29'],
      [],
      new Map(),
      fixedNow,
    )
    expect(r).toEqual([
      { workDate: '2026-04-28', workingMembers: 0, totalWorkingMinutes: 0 },
      { workDate: '2026-04-29', workingMembers: 0, totalWorkingMinutes: 0 },
    ])
  })

  it('1 人 9h 勤務 (休憩 60 分) → 8h = 480 分', () => {
    const r = computeDailyTrend(
      ['2026-04-28'],
      [
        // 09:00 - 18:00 JST = 00:00 - 09:00 UTC
        entry('2026-04-28', '2026-04-28T00:00:00Z', '2026-04-28T09:00:00Z'),
      ],
      new Map([['2026-04-28', 60]]),
      fixedNow,
    )
    expect(r[0]).toEqual({
      workDate: '2026-04-28',
      workingMembers: 1,
      totalWorkingMinutes: 480,
    })
  })

  it('複数メンバー集計', () => {
    const r = computeDailyTrend(
      ['2026-04-28'],
      [
        entry('2026-04-28', '2026-04-28T00:00:00Z', '2026-04-28T08:00:00Z'), // 8h
        entry('2026-04-28', '2026-04-28T01:00:00Z', '2026-04-28T10:00:00Z'), // 9h
      ],
      new Map([['2026-04-28', 90]]), // 休憩計 90 分
      fixedNow,
    )
    // 合計 17h = 1020 - 90 = 930
    expect(r[0]?.workingMembers).toBe(2)
    expect(r[0]?.totalWorkingMinutes).toBe(930)
  })

  it('clockOut 未だなら fixedNow まで計上', () => {
    const r = computeDailyTrend(
      ['2026-04-29'],
      [entry('2026-04-29', '2026-04-29T00:00:00Z', null)], // 09:00 JST から (= 00:00 UTC)
      new Map(),
      new Date('2026-04-29T05:00:00Z'), // 14:00 JST
    )
    // 5h = 300 分
    expect(r[0]?.totalWorkingMinutes).toBe(300)
  })

  it('clockIn が null なら出勤者カウント外', () => {
    const r = computeDailyTrend(
      ['2026-04-29'],
      [entry('2026-04-29', null, null)],
      new Map(),
      fixedNow,
    )
    expect(r[0]).toEqual({
      workDate: '2026-04-29',
      workingMembers: 0,
      totalWorkingMinutes: 0,
    })
  })

  it('対象日外の entry は無視 (date map で見つからない日)', () => {
    const r = computeDailyTrend(
      ['2026-04-29'],
      [entry('2026-04-28', '2026-04-28T00:00:00Z', '2026-04-28T08:00:00Z')],
      new Map(),
      fixedNow,
    )
    expect(r[0]).toEqual({
      workDate: '2026-04-29',
      workingMembers: 0,
      totalWorkingMinutes: 0,
    })
  })
})

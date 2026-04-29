import { describe, it, expect } from 'vitest'
import { deriveWorkSegments, totalMinutes } from './workSegments'

const D = (s: string) => new Date(s)

describe('deriveWorkSegments', () => {
  const FALLBACK = D('2026-04-29T12:00:00Z')

  it('clockIn なし (=不正な型) 相当として扱わない: 関数は ShiftPunch.clockInAt を Date と仮定するので未刻はテスト対象外', () => {
    // ShiftPunch.clockInAt は型上 Date 必須。null は呼び出し側で弾く前提。
    expect(true).toBe(true)
  })

  it('clockOut が null なら fallbackEnd で打ち切る', () => {
    const segs = deriveWorkSegments(
      { clockInAt: D('2026-04-29T09:00:00Z'), clockOutAt: null },
      [],
      D('2026-04-29T11:30:00Z'),
    )
    expect(segs).toHaveLength(1)
    expect(totalMinutes(segs)).toBe(150)
  })

  it('end <= start は空', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T10:00:00Z'),
        clockOutAt: D('2026-04-29T10:00:00Z'),
      },
      [],
      FALLBACK,
    )
    expect(segs).toEqual([])
  })

  it('break なしなら shift 全体を 1 セグメントで返す', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T09:00:00Z'),
        clockOutAt: D('2026-04-29T17:00:00Z'),
      },
      [],
      FALLBACK,
    )
    expect(segs).toHaveLength(1)
    expect(totalMinutes(segs)).toBe(8 * 60)
  })

  it('単一 break で 2 セグメントに分かれる', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T09:00:00Z'),
        clockOutAt: D('2026-04-29T18:00:00Z'),
      },
      [{ startAt: D('2026-04-29T12:00:00Z'), endAt: D('2026-04-29T13:00:00Z') }],
      FALLBACK,
    )
    expect(segs).toHaveLength(2)
    expect(totalMinutes(segs)).toBe(8 * 60) // 9h - 1h break
  })

  it('shift 範囲外の break は無視される', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T09:00:00Z'),
        clockOutAt: D('2026-04-29T17:00:00Z'),
      },
      [
        { startAt: D('2026-04-29T08:00:00Z'), endAt: D('2026-04-29T08:30:00Z') }, // 開始前
        { startAt: D('2026-04-29T18:00:00Z'), endAt: D('2026-04-29T18:30:00Z') }, // 退勤後
      ],
      FALLBACK,
    )
    expect(totalMinutes(segs)).toBe(8 * 60)
  })

  it('shift を跨ぐ break は範囲内にクリップ', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T09:00:00Z'),
        clockOutAt: D('2026-04-29T17:00:00Z'),
      },
      [
        { startAt: D('2026-04-29T08:00:00Z'), endAt: D('2026-04-29T10:00:00Z') }, // shift 内 1h
      ],
      FALLBACK,
    )
    expect(totalMinutes(segs)).toBe(7 * 60)
  })

  it('endAt が null の break は fallbackEnd まで休憩扱い', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T09:00:00Z'),
        clockOutAt: D('2026-04-29T17:00:00Z'),
      },
      [{ startAt: D('2026-04-29T15:00:00Z'), endAt: null }],
      D('2026-04-29T16:00:00Z'),
    )
    // 9-15 = 6h 労働、15- は休憩中で 17:00 まで全部休憩扱い (clockOut で頭打ち)
    expect(totalMinutes(segs)).toBe(6 * 60)
  })

  it('重なる break は union を取って二重計上しない', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T09:00:00Z'),
        clockOutAt: D('2026-04-29T17:00:00Z'),
      },
      [
        { startAt: D('2026-04-29T12:00:00Z'), endAt: D('2026-04-29T13:00:00Z') },
        { startAt: D('2026-04-29T12:30:00Z'), endAt: D('2026-04-29T13:30:00Z') },
      ],
      FALLBACK,
    )
    // union = 12:00-13:30 (1.5h)。shift = 09:00-17:00 = 8h、8h - 1.5h = 6.5h
    expect(totalMinutes(segs)).toBe(6 * 60 + 30)
  })

  it('複数 break が時系列順でない場合も正しく処理', () => {
    const segs = deriveWorkSegments(
      {
        clockInAt: D('2026-04-29T09:00:00Z'),
        clockOutAt: D('2026-04-29T18:00:00Z'),
      },
      [
        { startAt: D('2026-04-29T15:00:00Z'), endAt: D('2026-04-29T15:15:00Z') },
        { startAt: D('2026-04-29T12:00:00Z'), endAt: D('2026-04-29T13:00:00Z') },
      ],
      D('2026-04-29T20:00:00Z'),
    )
    // 9h - 1h - 15min = 7h45min
    expect(totalMinutes(segs)).toBe(7 * 60 + 45)
    expect(segs).toHaveLength(3)
  })
})

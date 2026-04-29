import { describe, it, expect } from 'vitest'
import { formatProposedBreaks } from './formatBreaks'

describe('formatProposedBreaks', () => {
  it('null は空配列を返す', () => {
    expect(formatProposedBreaks(null)).toEqual([])
  })

  it('空配列は空配列を返す', () => {
    expect(formatProposedBreaks([])).toEqual([])
  })

  it('単一セグメントを HH:MM〜HH:MM で整形 (Asia/Tokyo)', () => {
    // UTC 03:00 = JST 12:00, UTC 04:00 = JST 13:00
    expect(
      formatProposedBreaks([
        {
          startAt: '2026-04-29T03:00:00.000Z',
          endAt: '2026-04-29T04:00:00.000Z',
        },
      ]),
    ).toEqual(['12:00〜13:00'])
  })

  it('endAt が null なら HH:MM〜 のみ', () => {
    expect(
      formatProposedBreaks([
        { startAt: '2026-04-29T03:00:00.000Z', endAt: null },
      ]),
    ).toEqual(['12:00〜'])
  })

  it('複数セグメントを順番通り整形', () => {
    expect(
      formatProposedBreaks([
        {
          startAt: '2026-04-29T03:00:00.000Z',
          endAt: '2026-04-29T03:30:00.000Z',
        },
        {
          startAt: '2026-04-29T06:00:00.000Z',
          endAt: '2026-04-29T07:00:00.000Z',
        },
      ]),
    ).toEqual(['12:00〜12:30', '15:00〜16:00'])
  })

  it('入力順を保つ (時系列でソートしない)', () => {
    // 後ろの方が早い時刻でも順序を入れ替えない
    const r = formatProposedBreaks([
      {
        startAt: '2026-04-29T06:00:00.000Z',
        endAt: '2026-04-29T07:00:00.000Z',
      },
      {
        startAt: '2026-04-29T03:00:00.000Z',
        endAt: '2026-04-29T04:00:00.000Z',
      },
    ])
    expect(r).toEqual(['15:00〜16:00', '12:00〜13:00'])
  })

  it('JST 0 時跨ぎ (UTC 表現で前日になる) も正しく時刻だけ抽出', () => {
    // UTC 15:30 = JST 翌 00:30
    expect(
      formatProposedBreaks([
        {
          startAt: '2026-04-28T15:00:00.000Z',
          endAt: '2026-04-28T15:30:00.000Z',
        },
      ]),
    ).toEqual(['00:00〜00:30'])
  })
})

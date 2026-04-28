import { describe, expect, it } from 'vitest'
import { buildCalendarGrid } from './calendarGrid'

describe('buildCalendarGrid', () => {
  it('2026-04 (1 日が水曜) → 1 行目は [pad×3, 4/1, 4/2, 4/3, 4/4]', () => {
    const grid = buildCalendarGrid('2026-04')
    const firstRow = grid[0]!
    expect(firstRow).toHaveLength(7)
    expect(firstRow[0]).toEqual({ kind: 'pad' })
    expect(firstRow[1]).toEqual({ kind: 'pad' })
    expect(firstRow[2]).toEqual({ kind: 'pad' })
    expect(firstRow[3]).toMatchObject({
      kind: 'inMonth',
      date: '2026-04-01',
      day: 1,
      dayOfWeek: 3, // Wed
      isWeekend: false,
    })
    expect(firstRow[6]).toMatchObject({ day: 4, dayOfWeek: 6, isWeekend: true })
  })

  it('全セルは 7 の倍数', () => {
    const grid = buildCalendarGrid('2026-04')
    const total = grid.reduce((sum, row) => sum + row.length, 0)
    expect(total % 7).toBe(0)
  })

  it('当月日数 30 が正しく出る (2026-04)', () => {
    const grid = buildCalendarGrid('2026-04')
    const inMonth = grid
      .flat()
      .filter((c): c is Extract<typeof c, { kind: 'inMonth' }> => c.kind === 'inMonth')
    expect(inMonth).toHaveLength(30)
    expect(inMonth[0]?.day).toBe(1)
    expect(inMonth[29]?.day).toBe(30)
  })

  it('2026-02 は 28 日', () => {
    const grid = buildCalendarGrid('2026-02')
    const inMonth = grid
      .flat()
      .filter((c): c is Extract<typeof c, { kind: 'inMonth' }> => c.kind === 'inMonth')
    expect(inMonth).toHaveLength(28)
  })

  it('土日に isWeekend=true', () => {
    const grid = buildCalendarGrid('2026-04')
    const cells = grid.flat()
    const apr4 = cells.find(
      (c) => c.kind === 'inMonth' && c.date === '2026-04-04',
    )
    const apr5 = cells.find(
      (c) => c.kind === 'inMonth' && c.date === '2026-04-05',
    )
    expect(apr4?.kind === 'inMonth' && apr4.isWeekend).toBe(true)
    expect(apr5?.kind === 'inMonth' && apr5.isWeekend).toBe(true)
  })

  it('月初が日曜なら pad 0 個', () => {
    // 2026-03 1 日は日曜
    const grid = buildCalendarGrid('2026-03')
    expect(grid[0]?.[0]).toMatchObject({
      kind: 'inMonth',
      date: '2026-03-01',
      day: 1,
    })
  })

  it('月末が土曜なら末尾 pad 0 個 (2026-02 = 2/28 土)', () => {
    const grid = buildCalendarGrid('2026-02')
    const lastRow = grid[grid.length - 1]!
    expect(lastRow[lastRow.length - 1]).toMatchObject({
      kind: 'inMonth',
      day: 28,
      dayOfWeek: 6,
    })
  })

  it('うるう年 2024-02 は 29 日', () => {
    const grid = buildCalendarGrid('2024-02')
    const inMonth = grid
      .flat()
      .filter((c): c is Extract<typeof c, { kind: 'inMonth' }> => c.kind === 'inMonth')
    expect(inMonth).toHaveLength(29)
  })
})

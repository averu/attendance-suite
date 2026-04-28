// 月カレンダーのグリッド構築 (純関数)。
// 1 週 = 7 日 (Sun-Sat) のセル配列を返す。前月/翌月日は null で埋める。

export type CalendarCell =
  | {
      kind: 'inMonth'
      date: string // YYYY-MM-DD
      day: number
      dayOfWeek: number // 0=Sun .. 6=Sat
      isWeekend: boolean
    }
  | { kind: 'pad' }

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function dayOfWeekUTC(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/**
 * yearMonth ('YYYY-MM') の calendar grid を 7 列 × 必要行 (5 or 6) で返す。
 * 月初が水曜なら、最初の行は [pad, pad, pad, pad日1, 2, 3, 4]。
 */
export function buildCalendarGrid(yearMonth: string): CalendarCell[][] {
  const [y, m] = yearMonth.split('-').map(Number)
  const total = daysInMonth(y as number, m as number)
  const firstDow = dayOfWeekUTC(y as number, m as number, 1)

  const cells: CalendarCell[] = []
  // 前月分 pad
  for (let i = 0; i < firstDow; i++) {
    cells.push({ kind: 'pad' })
  }
  // 当月日
  for (let d = 1; d <= total; d++) {
    const dow = dayOfWeekUTC(y as number, m as number, d)
    cells.push({
      kind: 'inMonth',
      date: `${yearMonth}-${pad(d)}`,
      day: d,
      dayOfWeek: dow,
      isWeekend: dow === 0 || dow === 6,
    })
  }
  // 末尾 pad で 7 の倍数に揃える
  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'pad' })
  }

  // 7 列の行に分割
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

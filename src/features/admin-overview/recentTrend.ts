// 過去 N 日の日別集計を純関数で計算する。
// time_entry の生データを受け取り、日付ごとに「出勤者数 / 合計労働時間」を返す。

export type TrendInputEntry = {
  workDate: string // YYYY-MM-DD
  clockInAt: Date | null
  clockOutAt: Date | null
}

export type TrendBreakSlice = {
  workDate: string
  durationMinutes: number
}

export type DailyTrendPoint = {
  workDate: string
  workingMembers: number // clockIn のあった人数
  totalWorkingMinutes: number // 全員の労働分合計 (休憩控除済)
}

function diffMinutes(start: Date, end: Date | null, fallbackEnd: Date): number {
  const e = end ?? fallbackEnd
  return Math.max(0, Math.round((e.getTime() - start.getTime()) / 60_000))
}

/**
 * dates: 計算対象の YYYY-MM-DD 配列 (古→新順、抜けなし)
 * entries: 期間内の time_entry (DB 行)
 * breaksByDate: workDate → その日の休憩分合計
 *
 * 前提:
 *   - 1 entry は単一 workDate 内で完結 (深夜勤務で 00:00 をまたぐ場合も entry.workDate = 出勤日に集計)
 *   - clockOut 未実施の entry は now まで集計する。過去日に未退勤 entry が残っている場合は
 *     値が膨張するため、呼び出し側で「未退勤は今日だけ」のフィルタを推奨
 */
export function computeDailyTrend(
  dates: ReadonlyArray<string>,
  entries: ReadonlyArray<TrendInputEntry>,
  breaksByDate: Map<string, number>,
  now: Date = new Date(),
): DailyTrendPoint[] {
  const byDate = new Map<string, { count: number; minutes: number }>()
  for (const e of entries) {
    if (!e.clockInAt) continue
    const total = diffMinutes(e.clockInAt, e.clockOutAt, now)
    const cur = byDate.get(e.workDate) ?? { count: 0, minutes: 0 }
    cur.count += 1
    cur.minutes += total
    byDate.set(e.workDate, cur)
  }
  return dates.map((d) => {
    const agg = byDate.get(d) ?? { count: 0, minutes: 0 }
    const breakSum = breaksByDate.get(d) ?? 0
    return {
      workDate: d,
      workingMembers: agg.count,
      totalWorkingMinutes: Math.max(0, agg.minutes - breakSum),
    }
  })
}

/**
 * 'YYYY-MM-DD' の配列を、anchor の N 日前から anchor まで生成する (古い順)。
 */
export function buildPastDays(anchor: string, days: number): string[] {
  const [y, m, d] = anchor.split('-').map(Number)
  const result: string[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const dt = new Date(
      Date.UTC(y as number, (m as number) - 1, (d as number) - offset),
    )
    const yyyy = dt.getUTCFullYear()
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(dt.getUTCDate()).padStart(2, '0')
    result.push(`${yyyy}-${mm}-${dd}`)
  }
  return result
}

// 労基法 39 条の有給休暇付与日数表。
//
// 一般労働者 (週所定 30h 以上 OR 週所定 5 日以上):
//   勤続 6m=10, 1y6m=11, 2y6m=12, 3y6m=14, 4y6m=16, 5y6m=18, 6y6m+=20
//
// 比例付与 (週所定 30h 未満 かつ 週所定 4 日以下):
//   週 4 日: 7 / 8 / 9 / 10 / 12 / 13 / 15
//   週 3 日: 5 / 6 / 6 / 8 / 9 / 10 / 11
//   週 2 日: 3 / 4 / 4 / 5 / 6 / 6 / 7
//   週 1 日: 1 / 2 / 2 / 2 / 3 / 3 / 3
//   (年所定労働日数で代替判定するケースもあるが本実装は週所定日数のみ対応)

const REGULAR_TABLE = [10, 11, 12, 14, 16, 18, 20] as const

const PROPORTIONAL_TABLE: Record<number, ReadonlyArray<number>> = {
  4: [7, 8, 9, 10, 12, 13, 15],
  3: [5, 6, 6, 8, 9, 10, 11],
  2: [3, 4, 4, 5, 6, 6, 7],
  1: [1, 2, 2, 2, 3, 3, 3],
}

export type LeaveGrantTableInput = {
  /** 勤続年数 (0.5, 1.5, 2.5, ...). 0.5 未満は付与対象外 */
  yearsOfService: number
  /** 週所定労働日数 (1-7) */
  weeklyScheduledDays: number
  /** 週所定労働時間 (時間) */
  weeklyScheduledHours: number
}

/**
 * 付与日数を表からルックアップする。0.5 未満 (= 6 ヶ月未満) は 0。
 * 一般労働者 (週 30h 以上 OR 週 5 日以上) は REGULAR_TABLE、そうでなければ比例付与表。
 * 比例付与でも週 1-4 日の範囲外 (= 0 日 / 週 5 日以上で 30h 未満) は 0 日扱い。
 */
export function lookupPaidLeaveDays(input: LeaveGrantTableInput): number {
  if (input.yearsOfService < 0.5) return 0
  const idx = Math.min(6, Math.floor(input.yearsOfService - 0.5))
  const isRegular =
    input.weeklyScheduledHours >= 30 || input.weeklyScheduledDays >= 5
  if (isRegular) return REGULAR_TABLE[idx]!
  // 比例付与: 週 1-4 日のみ
  const dayKey = Math.floor(input.weeklyScheduledDays)
  const row = PROPORTIONAL_TABLE[dayKey]
  if (!row) return 0
  return row[idx] ?? 0
}

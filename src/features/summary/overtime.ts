// 残業時間計算 (純関数)。
//
// MVP の単純モデル:
//   - 1 日の所定労働時間 = 8h (480 分) を超えた分を残業として加算
//   - 月単位で Σ max(0, dayWorkingMinutes - 480) を返す
// 法定残業 / 深夜割増 / 法定休日割増は対象外 (Phase 6 以降)。

export const STANDARD_DAILY_MINUTES = 480

export function dailyOvertimeMinutes(workingMinutes: number): number {
  return Math.max(0, workingMinutes - STANDARD_DAILY_MINUTES)
}

export function monthlyOvertimeMinutes(dailyWorkingMinutes: number[]): number {
  return dailyWorkingMinutes.reduce((sum, m) => sum + dailyOvertimeMinutes(m), 0)
}

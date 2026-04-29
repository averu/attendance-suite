// 週単位の法定外残業を算出する純関数。
// 労基法 32 条: 1 週 40 時間を超える労働は法定時間外。
// 二重計上対策: 日次で既に 8h 超 (= 法定外) 計上済みの分は週次集計から差し引く。

/** 法定 1 週上限 (= 40h)。労基法 32 条 */
export const LEGAL_WEEKLY_LIMIT_MINUTES = 40 * 60

export type WeeklyBreakdown = {
  totalWorkedMinutes: number
  weeklyLegalThresholdMinutes: number
  /** 各日の `legalOvertimeMinutes` (8h 超) の合計。日次 OT として既計上 */
  dailyLegalOvertimeSumMinutes: number
  /** 週 40h を超え、かつ日次でまだ計上されていない追加分 */
  weeklyOnlyLegalOvertimeMinutes: number
  /** 当週の合計法定外残業 = daily + weekly-only (重複なし) */
  totalLegalOvertimeMinutes: number
}

/**
 * 週次合計から法定外残業を算出。
 *
 * @param dailyWorkedMinutes 7 日分の実労働分 (要素数チェックはしない。0 詰め必須)
 * @param dailyLegalOvertimeMinutes 同 7 日分の日次法定外 (computeDailyBreakdown の結果)
 * @param weeklyLimit 週上限 (default 2400 = 40h。一部業種は 44h なので overridable)
 *
 * 解釈例:
 *  - 9h × 5 日: dailyLegal=5h, weekTotal=45h, weekly-only=max(0, (45-40) - 5) = 0, total=5h
 *  - 7h × 6 日: dailyLegal=0, weekTotal=42h, weekly-only=2h, total=2h
 *  - 10h × 4 + 6h × 1: dailyLegal=8h, weekTotal=46h, weekly-only=max(0, 6-8)=0, total=8h
 */
export function computeWeeklyBreakdown(
  dailyWorkedMinutes: ReadonlyArray<number>,
  dailyLegalOvertimeMinutes: ReadonlyArray<number>,
  weeklyLimit: number = LEGAL_WEEKLY_LIMIT_MINUTES,
): WeeklyBreakdown {
  const total = dailyWorkedMinutes.reduce((s, m) => s + Math.max(0, m), 0)
  const dailyLegalSum = dailyLegalOvertimeMinutes.reduce(
    (s, m) => s + Math.max(0, m),
    0,
  )
  const weeklyOver = Math.max(0, total - weeklyLimit)
  const weeklyOnly = Math.max(0, weeklyOver - dailyLegalSum)
  return {
    totalWorkedMinutes: total,
    weeklyLegalThresholdMinutes: weeklyLimit,
    dailyLegalOvertimeSumMinutes: dailyLegalSum,
    weeklyOnlyLegalOvertimeMinutes: weeklyOnly,
    totalLegalOvertimeMinutes: dailyLegalSum + weeklyOnly,
  }
}

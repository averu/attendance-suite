// 1 日の労働時間を「所定枠内 / 所定超だが法定内 / 法定外」に分解する純関数。

/** 法定 1 日上限 (= 8h)。労基法 32 条 */
export const LEGAL_DAILY_LIMIT_MINUTES = 480

export type DailyBreakdown = {
  workedMinutes: number
  scheduledMinutes: number
  /** 所定枠内に収まった分 (= min(worked, scheduled)) */
  withinScheduledMinutes: number
  /** 所定を超えたが法定 8h 以内の分 (= 法定内残業) */
  beyondScheduledWithinLegalMinutes: number
  /** 法定 8h を超えた分 (= 法定外残業 = 25% 以上の割増対象) */
  legalOvertimeMinutes: number
}

/**
 * 1 日の実労働分を所定 / 法定で 3 段階に分解。
 *
 * - withinScheduledMinutes: min(worked, scheduled)
 * - beyondScheduledWithinLegalMinutes: max(0, min(worked, 480) - scheduled) (所定超〜480)
 * - legalOvertimeMinutes: max(0, worked - 480)
 *
 * 合計 = workedMinutes (所定 ≤ 480 のとき). 所定 > 480 の変形労働時間制では
 * beyondScheduledWithinLegalMinutes が 0 のまま legalOvertime に流れる. 異常系も保つ。
 */
export function computeDailyBreakdown(
  workedMinutes: number,
  scheduledMinutes: number,
): DailyBreakdown {
  const worked = Math.max(0, workedMinutes)
  const scheduled = Math.max(0, scheduledMinutes)
  const within = Math.min(worked, scheduled)
  const beyond = Math.max(0, Math.min(worked, LEGAL_DAILY_LIMIT_MINUTES) - scheduled)
  const legal = Math.max(0, worked - LEGAL_DAILY_LIMIT_MINUTES)
  return {
    workedMinutes: worked,
    scheduledMinutes: scheduled,
    withinScheduledMinutes: within,
    beyondScheduledWithinLegalMinutes: beyond,
    legalOvertimeMinutes: legal,
  }
}

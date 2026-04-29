export type MemberMonthlySummary = {
  userId: string
  userName: string
  userEmail: string
  workingDays: number
  workingMinutes: number
  breakMinutes: number
  /** 1 日 8h 超過分の合計 (= legacy 互換)。labor の legalOvertimeMinutes と一致する想定 */
  overtimeMinutes: number
  /** 承認済み休暇の日数換算 (半休 = 0.5 日)。有給 (paid_full + paid_half_*) */
  paidLeaveDays: number
  /** 振替 / 特別 / 病欠 / その他 */
  otherLeaveDays: number
  /** 法定時間外残業 (日 8h 超 + 月 60h 超を含む全合計) の分 */
  legalOvertimeMinutes: number
  /** うち月 60h 超の部分 (50% 割増対象) */
  legalOvertimeOver60Minutes: number
  /** 深夜帯 (22:00-翌5:00 JST) の総分。残業内/外を問わない */
  lateNightMinutes: number
  /** 法定休日労働 (35% 割増対象) の分 */
  legalHolidayWorkedMinutes: number
}

export type OrgMonthlySummary = {
  yearMonth: string
  isLocked: boolean
  lockedAt: string | null
  scheduledWorkingDays: number // 平日 - 公休 (組織共通の所定労働日数)
  members: MemberMonthlySummary[]
}

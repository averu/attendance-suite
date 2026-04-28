export type MemberMonthlySummary = {
  userId: string
  userName: string
  userEmail: string
  workingDays: number
  workingMinutes: number
  breakMinutes: number
  overtimeMinutes: number // 1 日 8h 超過分の合計 (深夜割増・法定休日は未対応)
  // 承認済み休暇の日数換算 (半休 = 0.5 日)
  paidLeaveDays: number // 有給 (paid_full + paid_half_*)
  otherLeaveDays: number // 振替 / 特別 / 病欠 / その他
}

export type OrgMonthlySummary = {
  yearMonth: string
  isLocked: boolean
  lockedAt: string | null
  scheduledWorkingDays: number // 平日 - 公休 (組織共通の所定労働日数)
  members: MemberMonthlySummary[]
}

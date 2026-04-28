export type MemberMonthlySummary = {
  userId: string
  userName: string
  userEmail: string
  workingDays: number
  workingMinutes: number
  breakMinutes: number
}

export type OrgMonthlySummary = {
  yearMonth: string
  isLocked: boolean
  lockedAt: string | null
  members: MemberMonthlySummary[]
}

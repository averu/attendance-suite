import type { TimeEntryStatus } from '@/features/attendance'

export type OrgTodayMember = {
  userId: string
  userName: string
  userEmail: string
  role: 'member' | 'admin' | 'owner'
  status: TimeEntryStatus // entry 無しなら 'not_started'
  clockInAt: string | null
  clockOutAt: string | null
  workingMinutes: number
  breakMinutes: number
}

export type OrgTodayCounts = {
  total: number
  notStarted: number
  working: number // working + on_break
  finished: number
}

export type OrgTodayStatus = {
  date: string
  counts: OrgTodayCounts
  members: OrgTodayMember[]
}

// 36 協定アセスメント DTO (1 メンバー分)
export type OrgSaburokuMemberFindingDTO = {
  userId: string
  userName: string
  userEmail: string
  severity: 'violation' | 'warning' | 'clean'
  finding: {
    annualLegalOvertimeMinutes: number
    annualLegalOvertimePlusHolidayMinutes: number
    exceedsAnnual360h: boolean
    exceedsAnnual720h: boolean
    specialClauseInvocationCount: number
    exceedsSpecialClauseInvocationLimit: boolean
    exceedsRollingAverage80h: boolean
    monthlyFindings: Array<{
      yearMonth: string
      legalOvertimeMinutes: number
      legalHolidayWorkedMinutes: number
      legalOvertimePlusHolidayMinutes: number
      exceedsMonthly45h: boolean
      exceedsMonthly100h: boolean
    }>
    rollingAverages: Array<{
      startYearMonth: string
      endYearMonth: string
      monthsCount: number
      averageMinutes: number
      exceeds80h: boolean
    }>
  }
}

export type OrgSaburokuResponseDTO = {
  asOfYearMonth: string
  windowStartYearMonth: string
  members: OrgSaburokuMemberFindingDTO[]
}

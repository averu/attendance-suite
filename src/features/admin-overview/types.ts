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

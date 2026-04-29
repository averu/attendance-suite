export type TimeEntryStatus = 'not_started' | 'working' | 'on_break' | 'finished'

export type BreakInterval = {
  id: string
  startAt: string // ISO
  endAt: string | null
}

export type TimeEntry = {
  id: string
  workDate: string // YYYY-MM-DD
  clockInAt: string | null
  clockOutAt: string | null
  status: TimeEntryStatus
  breaks: BreakInterval[]
}

export type TodayStatus = {
  date: string // YYYY-MM-DD (JST)
  entry: TimeEntry | null
  // server で先計算した派生値
  workingMinutes: number // 休憩除いた実労働分
  breakMinutes: number // 休憩合計分
}

export type DailyTotal = {
  workDate: string
  status: TimeEntryStatus
  clockInAt: string | null
  clockOutAt: string | null
  workingMinutes: number
  breakMinutes: number
}

// 監査ログ snapshot のボディ
export type AuditSnapshot = {
  entry: TimeEntry
}

export type AuditLogEntry = {
  id: string
  workDate: string
  action: 'edit' | 'create' | 'delete'
  actorUserId: string
  actorName: string
  before: AuditSnapshot | null
  after: AuditSnapshot | null
  note: string | null
  at: string // ISO
}

// 退勤忘れリマインダー (server/client 共有)
export type OpenReminder = {
  workDate: string
  clockInAt: string
  status: TimeEntryStatus
}

export type Role = 'member' | 'admin' | 'owner'
export type InviteRole = 'member' | 'admin'

export type Member = {
  membershipId: string
  userId: string
  email: string
  name: string
  role: Role
  joinedAt: string
  /** 労務情報: 雇入れ日 'YYYY-MM-DD'。未設定なら null */
  hireDate: string | null
  /** 週所定労働日数 (1-7)。未設定なら null */
  weeklyScheduledDays: number | null
  /** 週所定労働時間 (時間)。未設定なら null */
  weeklyScheduledHours: number | null
}

export type Invitation = {
  id: string
  email: string
  role: InviteRole
  token: string
  expiresAt: string
  acceptedAt: string | null
  invitedByName: string
  createdAt: string
}

export type Organization = {
  id: string
  name: string
  slug: string
  timezone: string
  /** 1 日の所定労働時間 (分)。default 480 = 8h */
  dailyScheduledMinutes: number
  /** 1 週の所定労働時間 (分)。default 2400 = 40h */
  weeklyScheduledMinutes: number
  /** 法定休日の曜日 (0=日, 1=月, ..., 6=土) */
  legalHolidayDow: number
}

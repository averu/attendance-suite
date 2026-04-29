export type LeaveType =
  | 'paid_full'
  | 'paid_half_am'
  | 'paid_half_pm'
  | 'substitute'
  | 'special'
  | 'sick'
  | 'other'

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type LeaveRequestDTO = {
  id: string
  requesterUserId: string
  requesterName: string
  leaveType: LeaveType
  startDate: string // YYYY-MM-DD
  endDate: string
  reason: string
  status: LeaveStatus
  createdAt: string
}

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  paid_full: '有給 (1 日)',
  paid_half_am: '午前半休',
  paid_half_pm: '午後半休',
  substitute: '振替休日',
  special: '特別休暇',
  sick: '病気休暇',
  other: 'その他',
}

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: '審査待ち',
  approved: '承認',
  rejected: '却下',
  cancelled: 'キャンセル',
}

// 管理者用: 1 メンバーの付与履歴 1 件
export type AdminLeaveGrantDTO = {
  id: string
  userId: string
  grantDate: string
  grantedDays: number
  source: 'auto' | 'manual'
  note: string | null
  createdAt: string
}

// /api/admin/leave-obligations のレスポンス (org 単位)
export type OrgPaidLeaveObligationDTO = {
  userId: string
  userName: string
  userEmail: string
  isUnconfigured: boolean
  obligations: Array<{
    grantDate: string
    periodEndDate: string
    obligedDays: number
    takenDays: number
    isPeriodEnded: boolean
    status: 'compliant' | 'violation' | 'pending'
  }>
  violationCount: number
  pendingCount: number
}

// /api/leave-requests/balance のレスポンス
export type PaidLeaveBalanceDTO =
  | { status: 'UNCONFIGURED' }
  | {
      status: 'OK'
      asOfDate: string
      hireDate: string
      weeklyScheduledDays: number
      weeklyScheduledHours: number
      grants: Array<{
        grantDate: string
        expiresAt: string
        grantedDays: number
        usedDays: number
        remainingDays: number
        isExpired: boolean
      }>
      totalGrantedActiveDays: number
      totalUsedDays: number
      remainingDays: number
      unallocatedUsedDays: number
      annualObligation: Array<{
        grantDate: string
        periodEndDate: string
        obligedDays: number
        takenDays: number
        isPeriodEnded: boolean
        status: 'compliant' | 'violation' | 'pending'
      }>
    }

export type CorrectionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type ProposedBreak = {
  startAt: string // ISO
  endAt: string | null
}

export type CorrectionRequestDTO = {
  id: string
  requesterUserId: string
  requesterName: string
  targetDate: string // YYYY-MM-DD
  proposedClockInAt: string | null
  proposedClockOutAt: string | null
  proposedBreaks: ProposedBreak[] | null
  reason: string
  status: CorrectionStatus
  createdAt: string
  reviewerName: string | null
  reviewedAt: string | null
  reviewComment: string | null
}

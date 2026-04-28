import type { LeaveType } from '@/features/leave-request'

const PAID_TYPES = new Set<LeaveType>(['paid_full', 'paid_half_am', 'paid_half_pm'])
const HALF_TYPES = new Set<LeaveType>(['paid_half_am', 'paid_half_pm'])

export type ApprovedLeaveSlice = {
  leaveType: LeaveType
  startDate: string // YYYY-MM-DD
  endDate: string
}

/**
 * yearMonth ('YYYY-MM') の範囲に重なる承認済み休暇から、
 * 1 user 分の paidLeaveDays / otherLeaveDays を計算する純関数。
 *
 * - 半休 (paid_half_am / paid_half_pm) は 0.5 日換算
 * - 1 日 (paid_full) は 1 日
 * - 複数日 (substitute / special / sick / other) は startDate〜endDate を当月で clip した日数
 */
export function countLeaveDaysInMonth(
  leaves: ApprovedLeaveSlice[],
  yearMonth: string,
): { paidLeaveDays: number; otherLeaveDays: number } {
  let paid = 0
  let other = 0
  for (const lv of leaves) {
    const overlapDays = countOverlapDays(lv.startDate, lv.endDate, yearMonth)
    if (overlapDays === 0) continue
    const value = HALF_TYPES.has(lv.leaveType) ? 0.5 : overlapDays
    if (PAID_TYPES.has(lv.leaveType)) {
      paid += value
    } else {
      other += value
    }
  }
  return { paidLeaveDays: paid, otherLeaveDays: other }
}

function countOverlapDays(
  startDate: string,
  endDate: string,
  yearMonth: string,
): number {
  // 文字列比較で当月範囲と clip
  const monthStart = `${yearMonth}-01`
  const monthEnd = lastDayOfMonth(yearMonth)
  const s = startDate < monthStart ? monthStart : startDate
  const e = endDate > monthEnd ? monthEnd : endDate
  if (s > e) return 0
  return diffInclusiveDays(s, e)
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const last = new Date(Date.UTC(y as number, m as number, 0)).getUTCDate()
  return `${yearMonth}-${String(last).padStart(2, '0')}`
}

function diffInclusiveDays(start: string, end: string): number {
  // 'YYYY-MM-DD' 同士の inclusive 差。タイムゾーン無関係に UTC で計算。
  const sd = new Date(`${start}T00:00:00Z`).getTime()
  const ed = new Date(`${end}T00:00:00Z`).getTime()
  return Math.floor((ed - sd) / 86_400_000) + 1
}

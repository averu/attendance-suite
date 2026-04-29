// 年 5 日取得義務 (労基法 39 条 7 項、2019/4 施行) の判定。
//
// 仕様:
//   10 日以上有給を付与された労働者について、付与日から 1 年以内に 5 日以上取得させる義務。
//   違反時は使用者に罰則 (1 名あたり 30 万円以下の罰金)。
//
// 本関数は付与履歴 + 取得履歴 + asOfDate を受け取り、各 (10 日以上の) 付与期間ごとに
// 「取得日数」「期間終了済か」「コンプライアンス状態」を返す。

import { addYearsYMD, compareYMD } from './dateMath'
import type { LeaveGrant } from './paidLeaveGrant'
import type { LeaveUsage } from './paidLeaveBalance'

export const ANNUAL_PAID_LEAVE_OBLIGATION_DAYS = 5
export const ANNUAL_OBLIGATION_GRANT_THRESHOLD = 10

export type AnnualObligationFinding = {
  grantDate: string
  /** 付与から 1 年後 ('YYYY-MM-DD') */
  periodEndDate: string
  obligedDays: number
  /** この期間内 [grantDate, periodEnd) に取得された有給日数合計 */
  takenDays: number
  /** 期間が asOfDate 時点で終了済か */
  isPeriodEnded: boolean
  /**
   * - true: 期間内 (or 終了後) で 5 日以上取得済 (コンプライアンス OK)
   * - false: 期間終了後で 5 日未満 (違反)
   * - 'pending': 期間進行中で 5 日未達 (期限内であれば是正可能)
   */
  status: 'compliant' | 'violation' | 'pending'
}

export function checkAnnualPaidLeaveObligation(
  grants: ReadonlyArray<LeaveGrant>,
  usages: ReadonlyArray<LeaveUsage>,
  asOfDate: string,
): AnnualObligationFinding[] {
  const findings: AnnualObligationFinding[] = []
  for (const g of grants) {
    if (g.grantedDays < ANNUAL_OBLIGATION_GRANT_THRESHOLD) continue
    const periodEnd = addYearsYMD(g.grantDate, 1)
    const taken = usages
      .filter(
        (u) =>
          compareYMD(u.date, g.grantDate) >= 0 &&
          compareYMD(u.date, periodEnd) < 0,
      )
      .reduce((sum, u) => sum + Math.max(0, u.days), 0)
    const isPeriodEnded = compareYMD(periodEnd, asOfDate) <= 0
    const status: AnnualObligationFinding['status'] =
      taken >= ANNUAL_PAID_LEAVE_OBLIGATION_DAYS
        ? 'compliant'
        : isPeriodEnded
          ? 'violation'
          : 'pending'
    findings.push({
      grantDate: g.grantDate,
      periodEndDate: periodEnd,
      obligedDays: ANNUAL_PAID_LEAVE_OBLIGATION_DAYS,
      takenDays: taken,
      isPeriodEnded,
      status,
    })
  }
  return findings
}

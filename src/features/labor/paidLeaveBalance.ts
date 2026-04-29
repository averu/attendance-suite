// 有給休暇残高計算 (2 年時効、FIFO 消化)。
//
// 仕様:
//   - 各付与は付与日 + 2 年で時効消滅 (労基法 115 条)
//   - 消化は古い付与から優先 (FIFO)。最も期限が近い分から取り崩す運用が一般的
//   - 取得 (usage) はその時点で時効未満かつ未消化の付与から差し引く
//   - asOfDate 時点で expiresAt <= asOfDate なら expired (残高は計上しない)

import { addYearsYMD, compareYMD } from './dateMath'
import type { LeaveGrant } from './paidLeaveGrant'

export type LeaveUsage = {
  /** 取得日 'YYYY-MM-DD' */
  date: string
  /** 取得日数 (半休=0.5, 全休=1.0 等) */
  days: number
}

export type GrantBalanceSlice = {
  grantDate: string
  expiresAt: string
  grantedDays: number
  usedDays: number
  remainingDays: number
  isExpired: boolean
}

export type LeaveBalanceSnapshot = {
  asOfDate: string
  /** 時効内付与の grantedDays 合計 */
  totalGrantedActiveDays: number
  /** 全 usage の合計 (時効内/外問わず) */
  totalUsedDays: number
  /** 時効内に残っている残日数合計 */
  remainingDays: number
  /** 取得が残高を超えた分 (異常データ検出用。0 が正常) */
  unallocatedUsedDays: number
  /** 付与単位の内訳 (古い順) */
  grants: GrantBalanceSlice[]
}

/**
 * 付与履歴と取得履歴から asOfDate 時点の残高を算出する。
 *
 * 1. 付与を grantDate 昇順にソート、各付与に expiresAt = grantDate + 2y を付与
 * 2. 取得を date 昇順に処理: 古い付与 (期限近) から優先して消化
 *    - 取得日時点で未付与 (grantDate > usage.date) または既に時効 (expiresAt <= usage.date) の付与はスキップ
 * 3. asOfDate 時点で expiresAt <= asOfDate の付与は expired フラグ
 */
export function computeLeaveBalance(
  grants: ReadonlyArray<LeaveGrant>,
  usages: ReadonlyArray<LeaveUsage>,
  asOfDate: string,
): LeaveBalanceSnapshot {
  const slices: GrantBalanceSlice[] = [...grants]
    .sort((a, b) => a.grantDate.localeCompare(b.grantDate))
    .map((g) => ({
      grantDate: g.grantDate,
      expiresAt: addYearsYMD(g.grantDate, 2),
      grantedDays: g.grantedDays,
      usedDays: 0,
      remainingDays: g.grantedDays,
      isExpired: false,
    }))

  let unallocated = 0
  const sortedUsages = [...usages].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  for (const u of sortedUsages) {
    let remaining = Math.max(0, u.days)
    for (const s of slices) {
      if (remaining <= 0) break
      // 付与日より前 / 既に時効 → 消化対象外
      if (compareYMD(s.grantDate, u.date) > 0) continue
      if (compareYMD(s.expiresAt, u.date) <= 0) continue
      if (s.remainingDays <= 0) continue
      const consume = Math.min(remaining, s.remainingDays)
      s.usedDays += consume
      s.remainingDays -= consume
      remaining -= consume
    }
    unallocated += remaining
  }

  for (const s of slices) {
    if (compareYMD(s.expiresAt, asOfDate) <= 0) {
      s.isExpired = true
    }
  }

  const totalGrantedActiveDays = slices
    .filter((s) => !s.isExpired)
    .reduce((sum, s) => sum + s.grantedDays, 0)
  const totalUsedDays = slices.reduce((sum, s) => sum + s.usedDays, 0)
  const remainingDays = slices
    .filter((s) => !s.isExpired)
    .reduce((sum, s) => sum + s.remainingDays, 0)

  return {
    asOfDate,
    totalGrantedActiveDays,
    totalUsedDays,
    remainingDays,
    unallocatedUsedDays: unallocated,
    grants: slices,
  }
}

// 雇入れ日から有給付与スケジュール (= 付与基準日列) を生成し、付与日ごとの日数を決定する。

import { addMonthsYMD, addYearsYMD, compareYMD } from './dateMath'
import { lookupPaidLeaveDays } from './paidLeaveGrantTable'

export type EmployeeWorkProfile = {
  /** 雇入れ日 'YYYY-MM-DD' */
  hireDate: string
  /** 週所定労働日数 (1-7). 比例付与判定に使う */
  weeklyScheduledDays: number
  /** 週所定労働時間 (時間) */
  weeklyScheduledHours: number
}

export type LeaveGrant = {
  /** 付与日 'YYYY-MM-DD' */
  grantDate: string
  /** その付与時点の勤続年数 (0.5, 1.5, ...) */
  yearsOfService: number
  /** 付与日数 (出勤率不足で 0 日になる場合あり) */
  grantedDays: number
  /** 出勤率 8 割未達のため不付与だった場合 true */
  withheldFor80PctRule: boolean
}

/**
 * 雇入れ日から asOfDate までの付与日列を生成。
 * 1 回目: 雇入れ日 + 6 ヶ月、以降は前回付与日 + 1 年。
 * いずれも asOfDate 以前のもののみ (asOfDate と等しい場合は含む)。
 */
export function computeGrantDates(
  hireDate: string,
  asOfDate: string,
): Array<{ grantDate: string; yearsOfService: number }> {
  const out: Array<{ grantDate: string; yearsOfService: number }> = []
  let yos = 0.5
  let d = addMonthsYMD(hireDate, 6)
  while (compareYMD(d, asOfDate) <= 0) {
    out.push({ grantDate: d, yearsOfService: yos })
    yos += 1
    d = addYearsYMD(d, 1)
  }
  return out
}

/**
 * 雇入れ日から asOfDate までの全付与記録を返す。
 * 出勤率は付与日 (key='YYYY-MM-DD') ごとに `attendanceRateAtGrant` で渡す:
 *   - rate < 0.8: その付与日は 0 日 (withheldFor80PctRule=true)
 *   - rate undefined: 8 割充足とみなして付与
 */
export function computePaidLeaveGrants(
  profile: EmployeeWorkProfile,
  asOfDate: string,
  attendanceRateAtGrant?: Readonly<Record<string, number>>,
): LeaveGrant[] {
  const dates = computeGrantDates(profile.hireDate, asOfDate)
  return dates.map(({ grantDate, yearsOfService }) => {
    const rate = attendanceRateAtGrant?.[grantDate]
    if (rate !== undefined && rate < 0.8) {
      return {
        grantDate,
        yearsOfService,
        grantedDays: 0,
        withheldFor80PctRule: true,
      }
    }
    const days = lookupPaidLeaveDays({
      yearsOfService,
      weeklyScheduledDays: profile.weeklyScheduledDays,
      weeklyScheduledHours: profile.weeklyScheduledHours,
    })
    return {
      grantDate,
      yearsOfService,
      grantedDays: days,
      withheldFor80PctRule: false,
    }
  })
}

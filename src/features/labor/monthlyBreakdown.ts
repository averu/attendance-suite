// 月次集計: 日次の DailyPremiumDecomposition を時系列順に積み上げる。
// decomposeDailyPremium が日ごとに carryIn (= 月内 OT 累積) を必要とするので、
// 月内の日付を昇順にイテレートして carryIn を渡しながら集計する。

import type {
  DailyPremiumDecomposition,
  LaborCategory,
} from './decomposeDailyPremium'
import { decomposeDailyPremium } from './decomposeDailyPremium'
import type { TimeRange } from './types'

export type DayInput = {
  /** YYYY-MM-DD (Asia/Tokyo) */
  workDate: string
  workSegments: ReadonlyArray<TimeRange>
  isLegalHoliday: boolean
}

export type MonthlyBreakdown = {
  /** 月内のすべての分カテゴリ合計 */
  totals: DailyPremiumDecomposition
  /** 法定外残業の月内合計 (= under60 + over60 の各 day/night 合計) */
  totalLegalOvertimeMinutes: number
  /** 法定外残業のうち月 60h 超の合計 */
  legalOvertimeOver60Minutes: number
  /** 法定休日労働 (深夜含む) の合計 */
  legalHolidayWorkedMinutes: number
  /** 深夜帯総分 (各バケットの night 合算) */
  totalLateNightMinutes: number
  /** 日次配列 (順序保持。各日の breakdown と当日 OT 分) */
  perDay: Array<{
    workDate: string
    decomposition: DailyPremiumDecomposition
    dailyLegalOvertimeMinutes: number
  }>
}

const EMPTY: DailyPremiumDecomposition = {
  withinLegalDaytimeMinutes: 0,
  withinLegalNightMinutes: 0,
  legalOvertimeUnder60DaytimeMinutes: 0,
  legalOvertimeUnder60NightMinutes: 0,
  legalOvertimeOver60DaytimeMinutes: 0,
  legalOvertimeOver60NightMinutes: 0,
  legalHolidayDaytimeMinutes: 0,
  legalHolidayNightMinutes: 0,
}

function add(
  acc: DailyPremiumDecomposition,
  d: DailyPremiumDecomposition,
): DailyPremiumDecomposition {
  return {
    withinLegalDaytimeMinutes: acc.withinLegalDaytimeMinutes + d.withinLegalDaytimeMinutes,
    withinLegalNightMinutes: acc.withinLegalNightMinutes + d.withinLegalNightMinutes,
    legalOvertimeUnder60DaytimeMinutes:
      acc.legalOvertimeUnder60DaytimeMinutes + d.legalOvertimeUnder60DaytimeMinutes,
    legalOvertimeUnder60NightMinutes:
      acc.legalOvertimeUnder60NightMinutes + d.legalOvertimeUnder60NightMinutes,
    legalOvertimeOver60DaytimeMinutes:
      acc.legalOvertimeOver60DaytimeMinutes + d.legalOvertimeOver60DaytimeMinutes,
    legalOvertimeOver60NightMinutes:
      acc.legalOvertimeOver60NightMinutes + d.legalOvertimeOver60NightMinutes,
    legalHolidayDaytimeMinutes: acc.legalHolidayDaytimeMinutes + d.legalHolidayDaytimeMinutes,
    legalHolidayNightMinutes: acc.legalHolidayNightMinutes + d.legalHolidayNightMinutes,
  }
}

/**
 * 月内の各日 (任意順) を受け取って集計する。
 * 内部で workDate (昇順) にソートして decomposeDailyPremium に carryIn を渡す。
 * laborCategory='manager' の場合は時間外/休日割増は 0、深夜帯のみ within night に集計される。
 * laborCategory='discretionary' で discretionaryDeemedMinutes 設定時はみなし時間ベースで OT 算出。
 */
export function computeMonthlyBreakdown(
  days: ReadonlyArray<DayInput>,
  laborCategory: LaborCategory = 'general',
  discretionaryDeemedMinutes: number | null | undefined = null,
): MonthlyBreakdown {
  const sorted = [...days].sort((a, b) => a.workDate.localeCompare(b.workDate))
  let totals = EMPTY
  let carryIn = 0
  const perDay: MonthlyBreakdown['perDay'] = []
  for (const d of sorted) {
    const r = decomposeDailyPremium(
      d.workSegments,
      d.isLegalHoliday,
      carryIn,
      laborCategory,
      discretionaryDeemedMinutes,
    )
    totals = add(totals, r.decomposition)
    carryIn += r.dailyLegalOvertimeMinutes
    perDay.push({
      workDate: d.workDate,
      decomposition: r.decomposition,
      dailyLegalOvertimeMinutes: r.dailyLegalOvertimeMinutes,
    })
  }
  const legalOvertimeOver60Minutes =
    totals.legalOvertimeOver60DaytimeMinutes +
    totals.legalOvertimeOver60NightMinutes
  const totalLegalOvertimeMinutes =
    totals.legalOvertimeUnder60DaytimeMinutes +
    totals.legalOvertimeUnder60NightMinutes +
    legalOvertimeOver60Minutes
  const legalHolidayWorkedMinutes =
    totals.legalHolidayDaytimeMinutes + totals.legalHolidayNightMinutes
  const totalLateNightMinutes =
    totals.withinLegalNightMinutes +
    totals.legalOvertimeUnder60NightMinutes +
    totals.legalOvertimeOver60NightMinutes +
    totals.legalHolidayNightMinutes
  return {
    totals,
    totalLegalOvertimeMinutes,
    legalOvertimeOver60Minutes,
    legalHolidayWorkedMinutes,
    totalLateNightMinutes,
    perDay,
  }
}

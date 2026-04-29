// 36 協定 (労基法 36 条) の上限判定。
//
// 原則:
//   月 45 時間以内 (法定外残業のみ)
//   年 360 時間以内 (法定外残業のみ)
//
// 特別条項付き 36 協定 (締結があれば原則を超えて以下まで可):
//   月 100 時間未満 (法定外残業 + 法定休日労働)            ※「未満」なので 100h ちょうどは NG
//   2-6 ヶ月の各連続平均 80 時間以下 (法定外残業 + 法定休日労働)
//   年 720 時間以内 (法定外残業のみ)
//   月 45 時間超は年 6 回まで (特別条項発動回数)
//
// 注意:
//   - 100h と 80h-avg は「法定外残業 + 法定休日労働」の合算
//   - 45h と 360h と 720h は「法定外残業のみ」 (法定休日労働は別建て)

export const SABUROKU_MONTHLY_LIMIT_MINUTES = 45 * 60
export const SABUROKU_ANNUAL_LIMIT_MINUTES = 360 * 60
/** 特別条項でも超えられない絶対上限 (= 100h 未満 → 100h 以上で違反) */
export const SABUROKU_SPECIAL_MONTHLY_HARD_LIMIT_MINUTES = 100 * 60
/** 特別条項時の年合計上限 (法定外残業) */
export const SABUROKU_SPECIAL_ANNUAL_LIMIT_MINUTES = 720 * 60
/** 特別条項時の N ヶ月平均上限 (法定外残業 + 法定休日労働) */
export const SABUROKU_SPECIAL_ROLLING_AVG_LIMIT_MINUTES = 80 * 60
/** 特別条項発動回数の年上限 */
export const SABUROKU_SPECIAL_INVOCATION_LIMIT = 6
/** 平均ウィンドウのサイズ範囲 (2..6 ヶ月) */
export const SABUROKU_ROLLING_WINDOW_RANGE = [2, 3, 4, 5, 6] as const

export type SaburokuMonthInput = {
  /** 'YYYY-MM' (Asia/Tokyo) */
  yearMonth: string
  /** 法定外残業合計 (8h/40h 超 + 月60h 超を含めた総量) */
  legalOvertimeMinutes: number
  /** 法定休日労働合計 */
  legalHolidayWorkedMinutes: number
}

export type SaburokuMonthFinding = {
  yearMonth: string
  legalOvertimeMinutes: number
  legalHolidayWorkedMinutes: number
  /** 100h / 80h-avg ルールに使う合計 */
  legalOvertimePlusHolidayMinutes: number
  /** 月 45h 超 (= 特別条項発動相当) */
  exceedsMonthly45h: boolean
  /** 月 100h 以上 (絶対 NG: 特別条項でも超えられない) */
  exceedsMonthly100h: boolean
}

export type SaburokuRollingAverageWindow = {
  startYearMonth: string
  endYearMonth: string
  monthsCount: number
  /** (法定外残業 + 法定休日労働) の月平均 */
  averageMinutes: number
  /** 80h 超か */
  exceeds80h: boolean
}

export type SaburokuYearFinding = {
  monthlyFindings: SaburokuMonthFinding[]
  /** 法定外残業の年合計 */
  annualLegalOvertimeMinutes: number
  /** (法定外残業 + 法定休日労働) の年合計 */
  annualLegalOvertimePlusHolidayMinutes: number
  /** 原則: 年 360h 超 */
  exceedsAnnual360h: boolean
  /** 特別条項: 年 720h 超 */
  exceedsAnnual720h: boolean
  /** 特別条項発動回数 (= 月 45h 超月数) */
  specialClauseInvocationCount: number
  /** 6 回超か */
  exceedsSpecialClauseInvocationLimit: boolean
  /** 2-6 ヶ月平均ウィンドウすべて */
  rollingAverages: SaburokuRollingAverageWindow[]
  /** 80h 超ウィンドウが 1 つでもあるか */
  exceedsRollingAverage80h: boolean
}

/** 単月の判定 */
export function assessSaburokuMonth(input: SaburokuMonthInput): SaburokuMonthFinding {
  const overtime = Math.max(0, input.legalOvertimeMinutes)
  const holiday = Math.max(0, input.legalHolidayWorkedMinutes)
  const sum = overtime + holiday
  return {
    yearMonth: input.yearMonth,
    legalOvertimeMinutes: overtime,
    legalHolidayWorkedMinutes: holiday,
    legalOvertimePlusHolidayMinutes: sum,
    exceedsMonthly45h: overtime > SABUROKU_MONTHLY_LIMIT_MINUTES,
    exceedsMonthly100h: sum >= SABUROKU_SPECIAL_MONTHLY_HARD_LIMIT_MINUTES,
  }
}

/**
 * 連続する N ヶ月 (N=2..6) の平均ウィンドウをすべて算出。
 * months は yearMonth 昇順にソート済の前提。
 */
export function computeRollingAverages(
  months: ReadonlyArray<SaburokuMonthInput>,
): SaburokuRollingAverageWindow[] {
  const sorted = [...months].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
  const sums = sorted.map(
    (m) =>
      Math.max(0, m.legalOvertimeMinutes) + Math.max(0, m.legalHolidayWorkedMinutes),
  )
  const windows: SaburokuRollingAverageWindow[] = []
  for (const k of SABUROKU_ROLLING_WINDOW_RANGE) {
    if (sorted.length < k) continue
    for (let i = 0; i + k <= sorted.length; i++) {
      let sum = 0
      for (let j = 0; j < k; j++) sum += sums[i + j] ?? 0
      const avg = sum / k
      windows.push({
        startYearMonth: sorted[i]!.yearMonth,
        endYearMonth: sorted[i + k - 1]!.yearMonth,
        monthsCount: k,
        averageMinutes: avg,
        exceeds80h: avg > SABUROKU_SPECIAL_ROLLING_AVG_LIMIT_MINUTES,
      })
    }
  }
  return windows
}

/**
 * 年度 (任意の 1-12 ヶ月) の総合判定。
 * 月 45h 超月数、年合計 360/720h、複数月平均 80h、月 100h 未満をまとめてチェック。
 */
export function assessSaburokuYear(
  months: ReadonlyArray<SaburokuMonthInput>,
): SaburokuYearFinding {
  const sorted = [...months].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
  const monthlyFindings = sorted.map(assessSaburokuMonth)
  const annualLegalOvertimeMinutes = monthlyFindings.reduce(
    (s, m) => s + m.legalOvertimeMinutes,
    0,
  )
  const annualLegalOvertimePlusHolidayMinutes = monthlyFindings.reduce(
    (s, m) => s + m.legalOvertimePlusHolidayMinutes,
    0,
  )
  const specialClauseInvocationCount = monthlyFindings.filter(
    (m) => m.exceedsMonthly45h,
  ).length
  const rollingAverages = computeRollingAverages(sorted)
  return {
    monthlyFindings,
    annualLegalOvertimeMinutes,
    annualLegalOvertimePlusHolidayMinutes,
    exceedsAnnual360h: annualLegalOvertimeMinutes > SABUROKU_ANNUAL_LIMIT_MINUTES,
    exceedsAnnual720h:
      annualLegalOvertimeMinutes > SABUROKU_SPECIAL_ANNUAL_LIMIT_MINUTES,
    specialClauseInvocationCount,
    exceedsSpecialClauseInvocationLimit:
      specialClauseInvocationCount > SABUROKU_SPECIAL_INVOCATION_LIMIT,
    rollingAverages,
    exceedsRollingAverage80h: rollingAverages.some((w) => w.exceeds80h),
  }
}

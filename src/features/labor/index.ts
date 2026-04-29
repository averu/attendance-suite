// 公開境界。features 外からはこの index.ts のみ参照する。
// labor は DB / UI を持たない pure-function feature。

export type { TimeRange, ShiftPunch, BreakSegment } from './types'
export { deriveWorkSegments, totalMinutes } from './workSegments'
export { nightMinutesInRange, totalNightMinutes } from './nightWork'
export {
  LEGAL_DAILY_LIMIT_MINUTES,
  computeDailyBreakdown,
} from './dailyOvertime'
export type { DailyBreakdown } from './dailyOvertime'
export {
  LEGAL_WEEKLY_LIMIT_MINUTES,
  computeWeeklyBreakdown,
} from './weeklyOvertime'
export type { WeeklyBreakdown } from './weeklyOvertime'
export {
  isLegalHoliday,
  jstDayOfWeek,
} from './legalHoliday'
export type { LegalHolidayPolicy } from './legalHoliday'
export {
  LEGAL_OVERTIME_PREMIUM,
  OVER_60H_OVERTIME_PREMIUM,
  LATE_NIGHT_PREMIUM,
  LEGAL_HOLIDAY_PREMIUM,
  computePremiumRate,
} from './premiumRates'
export type { PremiumAttrs } from './premiumRates'
export { decomposeDailyPremium } from './decomposeDailyPremium'
export type {
  DailyPremiumDecomposition,
  LaborCategory,
} from './decomposeDailyPremium'
export { computeMonthlyBreakdown } from './monthlyBreakdown'
export type { DayInput, MonthlyBreakdown } from './monthlyBreakdown'
export {
  SABUROKU_MONTHLY_LIMIT_MINUTES,
  SABUROKU_ANNUAL_LIMIT_MINUTES,
  SABUROKU_SPECIAL_MONTHLY_HARD_LIMIT_MINUTES,
  SABUROKU_SPECIAL_ANNUAL_LIMIT_MINUTES,
  SABUROKU_SPECIAL_ROLLING_AVG_LIMIT_MINUTES,
  SABUROKU_SPECIAL_INVOCATION_LIMIT,
  assessSaburokuMonth,
  computeRollingAverages,
  assessSaburokuYear,
} from './saburoku'
export type {
  SaburokuMonthInput,
  SaburokuMonthFinding,
  SaburokuYearFinding,
  SaburokuRollingAverageWindow,
} from './saburoku'
export { lookupPaidLeaveDays } from './paidLeaveGrantTable'
export type { LeaveGrantTableInput } from './paidLeaveGrantTable'
export { computeGrantDates, computePaidLeaveGrants } from './paidLeaveGrant'
export type { EmployeeWorkProfile, LeaveGrant } from './paidLeaveGrant'
export { computeLeaveBalance } from './paidLeaveBalance'
export type {
  LeaveUsage,
  GrantBalanceSlice,
  LeaveBalanceSnapshot,
} from './paidLeaveBalance'
export {
  ANNUAL_PAID_LEAVE_OBLIGATION_DAYS,
  ANNUAL_OBLIGATION_GRANT_THRESHOLD,
  checkAnnualPaidLeaveObligation,
} from './paidLeaveObligation'
export type { AnnualObligationFinding } from './paidLeaveObligation'

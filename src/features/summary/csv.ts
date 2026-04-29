// 月次集計 → CSV 文字列の純関数。DB に依存しないので vitest で直接テスト可能。
import { buildCsv } from '@/shared/lib/csv'
import type { OrgMonthlySummary } from './types'

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h}:${String(min).padStart(2, '0')}`
}

export function summaryToCsv(summary: OrgMonthlySummary): string {
  const rows = summary.members.map((m) => ({
    yearMonth: summary.yearMonth,
    userId: m.userId,
    userName: m.userName,
    userEmail: m.userEmail,
    workingDays: m.workingDays,
    paidLeaveDays: m.paidLeaveDays,
    otherLeaveDays: m.otherLeaveDays,
    workingMinutes: m.workingMinutes,
    workingHHMM: fmtMinutes(m.workingMinutes),
    legalOvertimeMinutes: m.legalOvertimeMinutes,
    legalOvertimeHHMM: fmtMinutes(m.legalOvertimeMinutes),
    over60hOvertimeMinutes: m.legalOvertimeOver60Minutes,
    over60hOvertimeHHMM: fmtMinutes(m.legalOvertimeOver60Minutes),
    lateNightMinutes: m.lateNightMinutes,
    lateNightHHMM: fmtMinutes(m.lateNightMinutes),
    legalHolidayWorkedMinutes: m.legalHolidayWorkedMinutes,
    legalHolidayWorkedHHMM: fmtMinutes(m.legalHolidayWorkedMinutes),
    breakMinutes: m.breakMinutes,
    breakHHMM: fmtMinutes(m.breakMinutes),
  }))
  return buildCsv(rows, [
    { key: 'yearMonth', header: '年月' },
    { key: 'userId', header: 'User ID' },
    { key: 'userName', header: '氏名' },
    { key: 'userEmail', header: 'Email' },
    { key: 'workingDays', header: '出勤日数' },
    { key: 'paidLeaveDays', header: '有給休暇日数' },
    { key: 'otherLeaveDays', header: 'その他休暇日数' },
    { key: 'workingMinutes', header: '労働分' },
    { key: 'workingHHMM', header: '労働 (HH:MM)' },
    { key: 'legalOvertimeMinutes', header: '法定外残業分' },
    { key: 'legalOvertimeHHMM', header: '法定外残業 (HH:MM)' },
    { key: 'over60hOvertimeMinutes', header: '月60h超 法定外分' },
    { key: 'over60hOvertimeHHMM', header: '月60h超 法定外 (HH:MM)' },
    { key: 'lateNightMinutes', header: '深夜帯 分' },
    { key: 'lateNightHHMM', header: '深夜帯 (HH:MM)' },
    { key: 'legalHolidayWorkedMinutes', header: '法定休日労働分' },
    { key: 'legalHolidayWorkedHHMM', header: '法定休日労働 (HH:MM)' },
    { key: 'breakMinutes', header: '休憩分' },
    { key: 'breakHHMM', header: '休憩 (HH:MM)' },
  ])
}

export function summaryCsvFilename(orgSlug: string, yearMonth: string): string {
  const safe = orgSlug || 'org'
  return `attendance-summary-${safe}-${yearMonth}.csv`
}

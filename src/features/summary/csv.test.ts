import { describe, expect, it } from 'vitest'
import { summaryCsvFilename, summaryToCsv } from './csv'
import { CSV_BOM } from '@/shared/lib/csv'
import type { OrgMonthlySummary } from './types'

const sample: OrgMonthlySummary = {
  yearMonth: '2026-04',
  isLocked: false,
  lockedAt: null,
  scheduledWorkingDays: 22,
  members: [
    {
      userId: 'u_1',
      userName: '山田太郎',
      userEmail: 'taro@example.com',
      workingDays: 20,
      workingMinutes: 9600, // 160:00
      breakMinutes: 1200, // 20:00
      overtimeMinutes: 360, // 6:00
      paidLeaveDays: 1.5,
      otherLeaveDays: 0,
    },
    {
      userId: 'u_2',
      userName: 'Lee, Min',
      userEmail: 'min@example.com',
      workingDays: 18,
      workingMinutes: 8640,
      breakMinutes: 900,
      overtimeMinutes: 0,
      paidLeaveDays: 0,
      otherLeaveDays: 2,
    },
  ],
}

describe('summaryToCsv', () => {
  it('BOM 付きで出力する', () => {
    const out = summaryToCsv(sample)
    expect(out.startsWith(CSV_BOM)).toBe(true)
  })

  it('header 行に必要な列がすべて含まれる', () => {
    const out = summaryToCsv(sample)
    const header = out.replace(CSV_BOM, '').split('\r\n')[0]
    expect(header).toBe(
      '年月,User ID,氏名,Email,出勤日数,有給休暇日数,その他休暇日数,労働分,労働 (HH:MM),残業分,残業 (HH:MM),休憩分,休憩 (HH:MM)',
    )
  })

  it('member 行が UI 入力順で並ぶ', () => {
    const out = summaryToCsv(sample)
    const lines = out.replace(CSV_BOM, '').split('\r\n').filter(Boolean)
    expect(lines[1]).toContain('山田太郎')
    expect(lines[1]).toBe(
      '2026-04,u_1,山田太郎,taro@example.com,20,1.5,0,9600,160:00,360,6:00,1200,20:00',
    )
  })

  it('残業 0 は "0" / "0:00" として出力される', () => {
    const out = summaryToCsv(sample)
    const lines = out.replace(CSV_BOM, '').split('\r\n').filter(Boolean)
    expect(lines[2]).toContain(',0,0:00,')
  })

  it('カンマを含むセル (氏名 "Lee, Min") は引用符で囲まれる', () => {
    const out = summaryToCsv(sample)
    expect(out).toContain('"Lee, Min"')
  })

  it('paidLeaveDays / otherLeaveDays が反映される', () => {
    const out = summaryToCsv(sample)
    // 1 行目に 1.5 と 0、2 行目に 0 と 2
    expect(out).toContain(',20,1.5,0,')
    expect(out).toContain(',18,0,2,')
  })

  it('空メンバーでも header だけ返す', () => {
    const out = summaryToCsv({
      ...sample,
      members: [],
    })
    const lines = out.replace(CSV_BOM, '').split('\r\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('年月')
  })
})

describe('summaryCsvFilename', () => {
  it('slug + 年月 を含む', () => {
    expect(summaryCsvFilename('acme', '2026-04')).toBe(
      'attendance-summary-acme-2026-04.csv',
    )
  })

  it('slug 空なら "org" にフォールバック', () => {
    expect(summaryCsvFilename('', '2026-04')).toBe(
      'attendance-summary-org-2026-04.csv',
    )
  })
})

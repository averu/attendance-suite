import { describe, expect, it } from 'vitest'
import {
  GetAttendanceDetailInputSchema,
  GetMemberAttendanceDetailInputSchema,
  GetMemberAttendanceInputSchema,
  ListMyAttendanceInputSchema,
  WorkDateSchema,
  YearMonthSchema,
} from './schemas'

describe('attendance schemas', () => {
  describe('YearMonthSchema', () => {
    it('YYYY-MM 通る', () => {
      expect(YearMonthSchema.parse('2026-04')).toBe('2026-04')
    })
    it('YYYY-13 reject', () => {
      expect(() => YearMonthSchema.parse('2026-13')).toThrow()
    })
    it('YYYY-1 reject', () => {
      expect(() => YearMonthSchema.parse('2026-1')).toThrow()
    })
    it('空文字 reject', () => {
      expect(() => YearMonthSchema.parse('')).toThrow()
    })
  })

  describe('WorkDateSchema', () => {
    it('YYYY-MM-DD 通る', () => {
      expect(WorkDateSchema.parse('2026-04-28')).toBe('2026-04-28')
    })
    it('日付 1 桁 reject', () => {
      expect(() => WorkDateSchema.parse('2026-4-28')).toThrow()
    })
  })

  describe('ListMyAttendanceInputSchema', () => {
    it('yearMonth のみ', () => {
      expect(ListMyAttendanceInputSchema.parse({ yearMonth: '2026-04' }))
        .toEqual({ yearMonth: '2026-04' })
    })
  })

  describe('GetAttendanceDetailInputSchema', () => {
    it('workDate のみ', () => {
      expect(GetAttendanceDetailInputSchema.parse({ workDate: '2026-04-28' }))
        .toEqual({ workDate: '2026-04-28' })
    })
  })

  describe('GetMemberAttendanceInputSchema', () => {
    it('userId + yearMonth', () => {
      const r = GetMemberAttendanceInputSchema.parse({
        userId: 'u_123',
        yearMonth: '2026-04',
      })
      expect(r.userId).toBe('u_123')
    })
    it('userId 空は reject', () => {
      expect(() =>
        GetMemberAttendanceInputSchema.parse({ userId: '', yearMonth: '2026-04' }),
      ).toThrow()
    })
  })

  describe('GetMemberAttendanceDetailInputSchema', () => {
    it('userId + workDate', () => {
      const r = GetMemberAttendanceDetailInputSchema.parse({
        userId: 'u_123',
        workDate: '2026-04-28',
      })
      expect(r.workDate).toBe('2026-04-28')
    })
  })
})

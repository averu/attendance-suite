import { describe, expect, it } from 'vitest'
import {
  CancelCorrectionRequestInputSchema,
  CreateCorrectionRequestInputSchema,
  ReviewCorrectionRequestInputSchema,
} from './schemas'

const ISO = '2026-04-28T01:00:00.000Z'

describe('correction-request schemas', () => {
  describe('CreateCorrectionRequestInputSchema', () => {
    it('targetDate + reason だけで通る (other は省略)', () => {
      const r = CreateCorrectionRequestInputSchema.parse({
        targetDate: '2026-04-28',
        reason: '打刻忘れ',
      })
      expect(r.targetDate).toBe('2026-04-28')
      expect(r.proposedClockInAt).toBeNull()
      expect(r.proposedClockOutAt).toBeNull()
      expect(r.proposedBreaks).toBeNull()
    })

    it('proposedClockInAt + proposedBreaks を受ける', () => {
      const r = CreateCorrectionRequestInputSchema.parse({
        targetDate: '2026-04-28',
        proposedClockInAt: ISO,
        proposedBreaks: [{ startAt: ISO, endAt: ISO }],
        reason: '修正',
      })
      expect(r.proposedClockInAt).toBe(ISO)
      expect(r.proposedBreaks).toHaveLength(1)
    })

    it('targetDate 不正は reject', () => {
      expect(() =>
        CreateCorrectionRequestInputSchema.parse({
          targetDate: '2026/04/28',
          reason: 'r',
        }),
      ).toThrow()
    })

    it('reason 空は reject', () => {
      expect(() =>
        CreateCorrectionRequestInputSchema.parse({
          targetDate: '2026-04-28',
          reason: '',
        }),
      ).toThrow()
    })

    it('proposedClockInAt の datetime 形式不正は reject', () => {
      expect(() =>
        CreateCorrectionRequestInputSchema.parse({
          targetDate: '2026-04-28',
          proposedClockInAt: 'not-iso',
          reason: 'r',
        }),
      ).toThrow()
    })
  })

  describe('CancelCorrectionRequestInputSchema', () => {
    it('uuid 通る', () => {
      expect(() =>
        CancelCorrectionRequestInputSchema.parse({
          requestId: '00000000-0000-0000-0000-000000000000',
        }),
      ).not.toThrow()
    })
    it('uuid 不正は reject', () => {
      expect(() =>
        CancelCorrectionRequestInputSchema.parse({ requestId: 'bad' }),
      ).toThrow()
    })
  })

  describe('ReviewCorrectionRequestInputSchema', () => {
    it('comment 省略可', () => {
      expect(() =>
        ReviewCorrectionRequestInputSchema.parse({
          requestId: '00000000-0000-0000-0000-000000000000',
        }),
      ).not.toThrow()
    })
    it('comment 1000 文字超は reject', () => {
      expect(() =>
        ReviewCorrectionRequestInputSchema.parse({
          requestId: '00000000-0000-0000-0000-000000000000',
          comment: 'a'.repeat(1001),
        }),
      ).toThrow()
    })
  })
})

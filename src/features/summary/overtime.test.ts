import { describe, expect, it } from 'vitest'
import {
  STANDARD_DAILY_MINUTES,
  dailyOvertimeMinutes,
  monthlyOvertimeMinutes,
} from './overtime'

describe('overtime', () => {
  it('STANDARD_DAILY_MINUTES is 480 (8h)', () => {
    expect(STANDARD_DAILY_MINUTES).toBe(480)
  })

  describe('dailyOvertimeMinutes', () => {
    it('8h ちょうどは 0', () => {
      expect(dailyOvertimeMinutes(480)).toBe(0)
    })
    it('8h 未満は 0', () => {
      expect(dailyOvertimeMinutes(420)).toBe(0)
    })
    it('9h なら 60 分残業', () => {
      expect(dailyOvertimeMinutes(540)).toBe(60)
    })
    it('11h30 なら 210 分残業', () => {
      expect(dailyOvertimeMinutes(690)).toBe(210)
    })
    it('負値は 0 (異常データ防御)', () => {
      expect(dailyOvertimeMinutes(-10)).toBe(0)
    })
    it('0 は 0', () => {
      expect(dailyOvertimeMinutes(0)).toBe(0)
    })
  })

  describe('monthlyOvertimeMinutes', () => {
    it('空配列は 0', () => {
      expect(monthlyOvertimeMinutes([])).toBe(0)
    })
    it('全日 8h 以下なら 0', () => {
      expect(monthlyOvertimeMinutes([300, 480, 200, 480])).toBe(0)
    })
    it('複数日の超過分を合算', () => {
      // 9h(60) + 10h(120) + 8h(0) + 7h(0) + 12h(240) = 420
      expect(monthlyOvertimeMinutes([540, 600, 480, 420, 720])).toBe(420)
    })
    it('負値日があっても 0 として扱い、他日は加算 (異常データ防御)', () => {
      // -10 → 0, 600 → 120
      expect(monthlyOvertimeMinutes([-10, 600])).toBe(120)
    })
  })
})

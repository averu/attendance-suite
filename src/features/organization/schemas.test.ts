import { describe, expect, it } from 'vitest'
import {
  AcceptInvitationInputSchema,
  ChangeRoleInputSchema,
  InviteInputSchema,
  RemoveMemberInputSchema,
  UpdateOrganizationInputSchema,
} from './schemas'

describe('organization schemas', () => {
  describe('InviteInputSchema', () => {
    it('email + role を受ける', () => {
      const r = InviteInputSchema.parse({ email: 'a@b.co', role: 'member' })
      expect(r.email).toBe('a@b.co')
      expect(r.role).toBe('member')
    })
    it('role 省略時は member', () => {
      const r = InviteInputSchema.parse({ email: 'a@b.co' })
      expect(r.role).toBe('member')
    })
    it('owner role は禁止', () => {
      expect(() =>
        InviteInputSchema.parse({ email: 'a@b.co', role: 'owner' }),
      ).toThrow()
    })
    it('email 形式不正は reject', () => {
      expect(() => InviteInputSchema.parse({ email: 'bad' })).toThrow()
    })
  })

  describe('ChangeRoleInputSchema', () => {
    it('uuid + role', () => {
      const r = ChangeRoleInputSchema.parse({
        membershipId: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      })
      expect(r.role).toBe('admin')
    })
    it('uuid 形式不正は reject', () => {
      expect(() =>
        ChangeRoleInputSchema.parse({ membershipId: 'not-uuid', role: 'admin' }),
      ).toThrow()
    })
  })

  describe('RemoveMemberInputSchema', () => {
    it('uuid のみ', () => {
      expect(() =>
        RemoveMemberInputSchema.parse({
          membershipId: '00000000-0000-0000-0000-000000000000',
        }),
      ).not.toThrow()
    })
  })

  describe('UpdateOrganizationInputSchema', () => {
    const baseValid = {
      name: 'Test Co',
      timezone: 'Asia/Tokyo',
      dailyScheduledMinutes: 480,
      weeklyScheduledMinutes: 2400,
      legalHolidayDow: 0,
    }
    it('完全な入力を受け入れる', () => {
      const r = UpdateOrganizationInputSchema.parse(baseValid)
      expect(r.name).toBe('Test Co')
      expect(r.dailyScheduledMinutes).toBe(480)
      expect(r.legalHolidayDow).toBe(0)
    })
    it('name 空は reject', () => {
      expect(() =>
        UpdateOrganizationInputSchema.parse({ ...baseValid, name: '' }),
      ).toThrow()
    })
    it('name 100 文字超は reject', () => {
      expect(() =>
        UpdateOrganizationInputSchema.parse({
          ...baseValid,
          name: 'a'.repeat(101),
        }),
      ).toThrow()
    })
    it('legalHolidayDow が範囲外 (7) は reject', () => {
      expect(() =>
        UpdateOrganizationInputSchema.parse({ ...baseValid, legalHolidayDow: 7 }),
      ).toThrow()
    })
    it('dailyScheduledMinutes が負は reject', () => {
      expect(() =>
        UpdateOrganizationInputSchema.parse({
          ...baseValid,
          dailyScheduledMinutes: -1,
        }),
      ).toThrow()
    })
  })

  describe('AcceptInvitationInputSchema', () => {
    it('token のみ', () => {
      const r = AcceptInvitationInputSchema.parse({ token: 'abc' })
      expect(r.token).toBe('abc')
    })
    it('空 token は reject', () => {
      expect(() => AcceptInvitationInputSchema.parse({ token: '' })).toThrow()
    })
  })
})

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
    it('name + timezone', () => {
      const r = UpdateOrganizationInputSchema.parse({
        name: 'Test Co',
        timezone: 'Asia/Tokyo',
      })
      expect(r.name).toBe('Test Co')
    })
    it('name 空は reject', () => {
      expect(() =>
        UpdateOrganizationInputSchema.parse({ name: '', timezone: 'Asia/Tokyo' }),
      ).toThrow()
    })
    it('name 100 文字超は reject', () => {
      expect(() =>
        UpdateOrganizationInputSchema.parse({
          name: 'a'.repeat(101),
          timezone: 'Asia/Tokyo',
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

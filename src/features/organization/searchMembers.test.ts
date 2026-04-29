import { describe, expect, it } from 'vitest'
import { searchMembers } from './searchMembers'
import type { Member } from './types'

const stubProfile = {
  hireDate: null,
  weeklyScheduledDays: null,
  weeklyScheduledHours: null,
} as const

const members: Member[] = [
  {
    membershipId: 'm1',
    userId: 'u1',
    name: '山田太郎',
    email: 'taro@example.com',
    role: 'admin',
    joinedAt: '2026-01-01T00:00:00Z',
    ...stubProfile,
  },
  {
    membershipId: 'm2',
    userId: 'u2',
    name: 'Lee Min',
    email: 'min@acme.co',
    role: 'member',
    joinedAt: '2026-02-01T00:00:00Z',
    ...stubProfile,
  },
  {
    membershipId: 'm3',
    userId: 'u3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'owner',
    joinedAt: '2025-12-01T00:00:00Z',
    ...stubProfile,
  },
]

describe('searchMembers', () => {
  it('空クエリは全件返す', () => {
    expect(searchMembers(members, '')).toHaveLength(3)
  })

  it('空白のみクエリも全件', () => {
    expect(searchMembers(members, '   ')).toHaveLength(3)
  })

  it('name 部分一致', () => {
    const r = searchMembers(members, '山田')
    expect(r).toHaveLength(1)
    expect(r[0]?.userId).toBe('u1')
  })

  it('email 部分一致', () => {
    const r = searchMembers(members, 'acme')
    expect(r).toHaveLength(1)
    expect(r[0]?.userId).toBe('u2')
  })

  it('role 完全一致', () => {
    const r = searchMembers(members, 'owner')
    expect(r).toHaveLength(1)
    expect(r[0]?.userId).toBe('u3')
  })

  it('大文字小文字無視 (TARO は email taro@... に lowercase 比較で一致)', () => {
    const r = searchMembers(members, 'TARO')
    expect(r).toHaveLength(1)
    expect(r[0]?.userId).toBe('u1')
    const r2 = searchMembers(members, 'taro')
    expect(r2).toHaveLength(1)
  })

  it('全角空白でも token 分割される', () => {
    const r = searchMembers(members, 'bob　owner')
    expect(r).toHaveLength(1)
    expect(r[0]?.userId).toBe('u3')
  })

  it('複数 token は AND', () => {
    const r = searchMembers(members, 'bob owner')
    expect(r).toHaveLength(1)
    expect(r[0]?.userId).toBe('u3')

    const r2 = searchMembers(members, 'bob admin')
    expect(r2).toHaveLength(0) // bob は owner なので admin を含まない
  })

  it('該当なしは空配列', () => {
    expect(searchMembers(members, 'zzznotfound')).toEqual([])
  })
})

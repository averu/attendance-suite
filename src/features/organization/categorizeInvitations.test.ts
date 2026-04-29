import { describe, it, expect } from 'vitest'
import { categorizeInvitations } from './categorizeInvitations'
import type { Invitation } from './types'

function inv(overrides: Partial<Invitation> & { id: string; expiresAt: string }): Invitation {
  return {
    email: 'x@example.com',
    role: 'member',
    token: 'tok-' + overrides.id,
    acceptedAt: null,
    invitedByName: 'Owner',
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('categorizeInvitations', () => {
  const NOW = new Date('2026-04-29T12:00:00.000Z')

  it('expiresAt > now を active に分類する', () => {
    const r = categorizeInvitations(
      [inv({ id: '1', expiresAt: '2026-05-01T00:00:00.000Z' })],
      NOW,
    )
    expect(r.active.map((i) => i.id)).toEqual(['1'])
    expect(r.expired).toEqual([])
    expect(r.active[0]?.isExpired).toBe(false)
  })

  it('expiresAt <= now を expired に分類する', () => {
    const r = categorizeInvitations(
      [inv({ id: '1', expiresAt: '2026-04-29T12:00:00.000Z' })],
      NOW,
    )
    expect(r.active).toEqual([])
    expect(r.expired.map((i) => i.id)).toEqual(['1'])
    expect(r.expired[0]?.isExpired).toBe(true)
  })

  it('active は期限が近い順 (昇順)', () => {
    const r = categorizeInvitations(
      [
        inv({ id: 'far', expiresAt: '2026-05-15T00:00:00.000Z' }),
        inv({ id: 'soon', expiresAt: '2026-05-01T00:00:00.000Z' }),
        inv({ id: 'mid', expiresAt: '2026-05-08T00:00:00.000Z' }),
      ],
      NOW,
    )
    expect(r.active.map((i) => i.id)).toEqual(['soon', 'mid', 'far'])
  })

  it('expired は最近切れた順 (降順)', () => {
    const r = categorizeInvitations(
      [
        inv({ id: 'long-ago', expiresAt: '2026-03-01T00:00:00.000Z' }),
        inv({ id: 'recent', expiresAt: '2026-04-28T00:00:00.000Z' }),
        inv({ id: 'mid', expiresAt: '2026-04-15T00:00:00.000Z' }),
      ],
      NOW,
    )
    expect(r.expired.map((i) => i.id)).toEqual(['recent', 'mid', 'long-ago'])
  })

  it('daysRemaining は端数を切り上げる (24h 以内でも 1)', () => {
    const r = categorizeInvitations(
      [inv({ id: '1', expiresAt: '2026-04-30T01:00:00.000Z' })], // 13h 後
      NOW,
    )
    expect(r.active[0]?.daysRemaining).toBe(1)
  })

  it('期限切れ招待の daysRemaining は 0 以下になる', () => {
    const r = categorizeInvitations(
      [inv({ id: '1', expiresAt: '2026-04-28T00:00:00.000Z' })], // 36h 前
      NOW,
    )
    expect(r.expired[0]?.daysRemaining).toBeLessThanOrEqual(0)
  })

  it('空配列はそれぞれ空を返す', () => {
    expect(categorizeInvitations([], NOW)).toEqual({ active: [], expired: [] })
  })

  it('expiresAt === now の境界値は expired 側に倒れ daysRemaining は 0', () => {
    const r = categorizeInvitations(
      [inv({ id: '1', expiresAt: NOW.toISOString() })],
      NOW,
    )
    expect(r.active).toEqual([])
    expect(r.expired).toHaveLength(1)
    expect(r.expired[0]?.isExpired).toBe(true)
    expect(r.expired[0]?.daysRemaining).toBe(0)
  })

  it('acceptedAt が non-null の招待も分類対象に含む (関数は acceptedAt を見ない)', () => {
    // 仕様: acceptedAt のフィルタは listInvitationsHandler 側の責務。
    // ここでは acceptedAt の値で挙動を変えないことを担保する。
    const r = categorizeInvitations(
      [
        inv({
          id: '1',
          expiresAt: '2026-05-01T00:00:00.000Z',
          acceptedAt: '2026-04-10T00:00:00.000Z',
        }),
      ],
      NOW,
    )
    expect(r.active.map((i) => i.id)).toEqual(['1'])
  })

  it('active と expired の混在を正しく振り分ける', () => {
    const r = categorizeInvitations(
      [
        inv({ id: 'a', expiresAt: '2026-05-01T00:00:00.000Z' }),
        inv({ id: 'b', expiresAt: '2026-04-20T00:00:00.000Z' }),
        inv({ id: 'c', expiresAt: '2026-05-10T00:00:00.000Z' }),
      ],
      NOW,
    )
    expect(r.active.map((i) => i.id)).toEqual(['a', 'c'])
    expect(r.expired.map((i) => i.id)).toEqual(['b'])
  })
})

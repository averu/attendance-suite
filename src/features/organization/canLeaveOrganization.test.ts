import { describe, expect, it } from 'vitest'
import { canLeaveOrganization } from './canLeaveOrganization'

describe('canLeaveOrganization', () => {
  it('member は常に脱退可', () => {
    const r = canLeaveOrganization(
      [
        { userId: 'u1', role: 'owner' },
        { userId: 'u2', role: 'member' },
      ],
      'u2',
    )
    expect(r.ok).toBe(true)
  })

  it('admin は常に脱退可', () => {
    const r = canLeaveOrganization(
      [
        { userId: 'u1', role: 'owner' },
        { userId: 'u2', role: 'admin' },
      ],
      'u2',
    )
    expect(r.ok).toBe(true)
  })

  it('唯一の owner は脱退不可 (LAST_OWNER)', () => {
    const r = canLeaveOrganization(
      [
        { userId: 'u1', role: 'owner' },
        { userId: 'u2', role: 'admin' },
      ],
      'u1',
    )
    expect(r).toEqual({ ok: false, code: 'LAST_OWNER' })
  })

  it('複数 owner なら一人脱退可', () => {
    const r = canLeaveOrganization(
      [
        { userId: 'u1', role: 'owner' },
        { userId: 'u2', role: 'owner' },
      ],
      'u1',
    )
    expect(r.ok).toBe(true)
  })

  it('caller がメンバーでないなら NOT_MEMBER', () => {
    const r = canLeaveOrganization(
      [{ userId: 'u1', role: 'owner' }],
      'u-other',
    )
    expect(r).toEqual({ ok: false, code: 'NOT_MEMBER' })
  })

  it('唯一のメンバーかつ唯一の owner は脱退不可', () => {
    const r = canLeaveOrganization([{ userId: 'u1', role: 'owner' }], 'u1')
    expect(r).toEqual({ ok: false, code: 'LAST_OWNER' })
  })

  it('唯一のメンバーが member の場合は脱退可 (理論上)', () => {
    // owner が居ない異常ケースだが LAST_OWNER ロジックは「自分が owner で唯一」のとき発動
    const r = canLeaveOrganization([{ userId: 'u1', role: 'member' }], 'u1')
    expect(r.ok).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { pickActiveMembership } from './pickActiveMembership'

describe('pickActiveMembership', () => {
  const memberships = [
    { id: 'm1', organizationId: 'org-1' },
    { id: 'm2', organizationId: 'org-2' },
    { id: 'm3', organizationId: 'org-3' },
  ]
  const getOrgId = (m: { organizationId: string }) => m.organizationId

  it('空配列なら null', () => {
    expect(pickActiveMembership([], 'org-1', getOrgId)).toBeNull()
    expect(pickActiveMembership([], null, getOrgId)).toBeNull()
  })

  it('preference 一致なし → 先頭にフォールバック', () => {
    expect(pickActiveMembership(memberships, 'org-999', getOrgId)?.id).toBe('m1')
  })

  it('preference null → 先頭', () => {
    expect(pickActiveMembership(memberships, null, getOrgId)?.id).toBe('m1')
    expect(pickActiveMembership(memberships, undefined, getOrgId)?.id).toBe('m1')
  })

  it('preference 一致あり → それを返す', () => {
    expect(pickActiveMembership(memberships, 'org-2', getOrgId)?.id).toBe('m2')
    expect(pickActiveMembership(memberships, 'org-3', getOrgId)?.id).toBe('m3')
  })

  it('memberships 1 件のみ', () => {
    const single = [{ id: 'm1', organizationId: 'org-1' }]
    expect(pickActiveMembership(single, 'org-1', getOrgId)?.id).toBe('m1')
    expect(pickActiveMembership(single, 'org-999', getOrgId)?.id).toBe('m1')
    expect(pickActiveMembership(single, null, getOrgId)?.id).toBe('m1')
  })

  it('joined row shape (m + o) でも extractor で対応可能', () => {
    type Joined = { m: { id: string; organizationId: string }; o: { name: string } }
    const joined: Joined[] = [
      { m: { id: 'm1', organizationId: 'org-1' }, o: { name: 'A' } },
      { m: { id: 'm2', organizationId: 'org-2' }, o: { name: 'B' } },
    ]
    const r = pickActiveMembership(joined, 'org-2', (j) => j.m.organizationId)
    expect(r?.m.id).toBe('m2')
  })
})

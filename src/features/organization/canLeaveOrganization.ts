// 組織脱退の前提条件を判定する純関数。
// 唯一の owner が脱退すると組織が「owner 不在」になるため拒否する簡易ルール。

export type LeaveCheckMember = {
  userId: string
  role: 'member' | 'admin' | 'owner'
}

export type LeaveCheckResult =
  | { ok: true }
  | { ok: false; code: 'LAST_OWNER' | 'NOT_MEMBER' }

/**
 * orgMembers: 対象組織の全 membership (caller 含む)
 * callerUserId: 脱退しようとしている user
 */
export function canLeaveOrganization(
  orgMembers: ReadonlyArray<LeaveCheckMember>,
  callerUserId: string,
): LeaveCheckResult {
  const me = orgMembers.find((m) => m.userId === callerUserId)
  if (!me) return { ok: false, code: 'NOT_MEMBER' }
  if (me.role === 'owner') {
    const ownerCount = orgMembers.filter((m) => m.role === 'owner').length
    if (ownerCount <= 1) return { ok: false, code: 'LAST_OWNER' }
  }
  return { ok: true }
}

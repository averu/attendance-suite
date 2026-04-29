import type { Invitation } from './types'

export type CategorizedInvitation = Invitation & {
  isExpired: boolean
  // expiresAt まで残り何日か (整数。負なら期限切れ)
  daysRemaining: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * 未受諾招待 (acceptedAt は呼び出し側でフィルタ済みである前提。本関数は値を見ない) を
 * 期限基準で active / expired に分類する。
 *
 * - active: expiresAt > now の招待。daysRemaining は ceil 切り上げで「今日も切れない最低保証日数」。
 *   ┗ daysRemaining === 1 は「24h 以内」ではなく「ceil で 1 になる範囲」なので最大 36h 弱を含む点に注意。
 * - expired: expiresAt <= now の招待。daysRemaining は 0 または負。
 *
 * 並び: active は期限が近い順 (daysRemaining 昇順 = 緊急度順)、expired は最近切れた順 (降順)。
 */
export function categorizeInvitations(
  invitations: ReadonlyArray<Invitation>,
  now: Date = new Date(),
): { active: CategorizedInvitation[]; expired: CategorizedInvitation[] } {
  const nowMs = now.getTime()
  const decorated: CategorizedInvitation[] = invitations.map((i) => {
    const remainingMs = new Date(i.expiresAt).getTime() - nowMs
    return {
      ...i,
      isExpired: remainingMs <= 0,
      daysRemaining: Math.ceil(remainingMs / MS_PER_DAY),
    }
  })
  // 既に decorated の daysRemaining が ms→day 換算済なので Date を再 parse せず比較する。
  const active = decorated
    .filter((i) => !i.isExpired)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
  const expired = decorated
    .filter((i) => i.isExpired)
    .sort((a, b) => b.daysRemaining - a.daysRemaining)
  return { active, expired }
}

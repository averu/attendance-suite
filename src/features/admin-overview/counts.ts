import type { OrgTodayCounts, OrgTodayMember } from './types'

/**
 * メンバー配列から状態カウントを集計する純関数。
 * - working / on_break をまとめて「勤務中 (working)」扱い
 */
export function computeOrgTodayCounts(
  members: ReadonlyArray<Pick<OrgTodayMember, 'status'>>,
): OrgTodayCounts {
  let notStarted = 0
  let working = 0
  let finished = 0
  for (const m of members) {
    if (m.status === 'not_started') notStarted += 1
    else if (m.status === 'working' || m.status === 'on_break') working += 1
    else if (m.status === 'finished') finished += 1
  }
  return {
    total: members.length,
    notStarted,
    working,
    finished,
  }
}

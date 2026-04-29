import { describe, expect, it } from 'vitest'
import { computeOrgTodayCounts } from './counts'

describe('computeOrgTodayCounts', () => {
  it('空配列はすべて 0', () => {
    expect(computeOrgTodayCounts([])).toEqual({
      total: 0,
      notStarted: 0,
      working: 0,
      finished: 0,
    })
  })

  it('not_started のみ', () => {
    const r = computeOrgTodayCounts([
      { status: 'not_started' },
      { status: 'not_started' },
    ])
    expect(r).toEqual({ total: 2, notStarted: 2, working: 0, finished: 0 })
  })

  it('working / on_break は両方とも working カウント', () => {
    const r = computeOrgTodayCounts([
      { status: 'working' },
      { status: 'on_break' },
      { status: 'working' },
    ])
    expect(r.working).toBe(3)
  })

  it('finished カウント', () => {
    const r = computeOrgTodayCounts([
      { status: 'finished' },
      { status: 'finished' },
    ])
    expect(r.finished).toBe(2)
  })

  it('混在パターン', () => {
    const r = computeOrgTodayCounts([
      { status: 'not_started' },
      { status: 'working' },
      { status: 'on_break' },
      { status: 'finished' },
      { status: 'finished' },
      { status: 'not_started' },
    ])
    expect(r).toEqual({ total: 6, notStarted: 2, working: 2, finished: 2 })
  })
})

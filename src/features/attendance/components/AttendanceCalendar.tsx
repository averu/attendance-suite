import { useSuspenseQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { attendanceQueries } from '../queries'
import { buildCalendarGrid } from '../calendarGrid'
import { holidayQueries } from '@/features/holidays'
import { Card, CardContent } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

const DOW_LABEL = ['日', '月', '火', '水', '木', '金', '土']

function fmtMinutes(m: number): string {
  if (m === 0) return ''
  const h = Math.floor(m / 60)
  const min = m % 60
  return min === 0 ? `${h}h` : `${h}h${min}m`
}

export function AttendanceCalendar({
  yearMonth,
  userId,
}: {
  yearMonth: string
  userId?: string
}) {
  const [{ data: items }, { data: holidayItems }] = useSuspenseQueries({
    queries: [
      attendanceQueries.monthly(yearMonth, userId),
      holidayQueries.list(yearMonth),
    ],
  })

  const grid = buildCalendarGrid(yearMonth)
  const entryByDate = new Map(items.map((d) => [d.workDate, d]))
  const holidayByDate = new Map(holidayItems.map((h) => [h.date, h]))

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {DOW_LABEL.map((label, i) => (
            <div
              key={label}
              className={cn(
                'bg-card text-xs font-medium py-2 text-center',
                i === 0 && 'text-destructive',
                i === 6 && 'text-blue-600',
              )}
            >
              {label}
            </div>
          ))}
          {grid.flat().map((cell, idx) => {
            if (cell.kind === 'pad') {
              return <div key={`p-${idx}`} className="bg-muted/30 min-h-20" />
            }
            const entry = entryByDate.get(cell.date)
            const holiday = holidayByDate.get(cell.date)
            const isHoliday = !!holiday
            const dayLabel = cell.day
            const dayClass = cn(
              'text-xs font-mono',
              cell.dayOfWeek === 0 || isHoliday ? 'text-destructive' : '',
              cell.dayOfWeek === 6 && !isHoliday ? 'text-blue-600' : '',
            )
            return (
              <Link
                key={cell.date}
                to={
                  userId
                    ? '/admin/members/$userId/$date'
                    : '/attendance/$date'
                }
                params={
                  userId
                    ? { userId, date: cell.date }
                    : { date: cell.date }
                }
                className={cn(
                  'bg-card hover:bg-accent transition-colors p-2 grid gap-1 min-h-20 text-sm',
                  isHoliday && 'bg-destructive/5',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={dayClass}>{dayLabel}</span>
                  {entry && entry.workingMinutes > 0 && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {fmtMinutes(entry.workingMinutes)}
                    </span>
                  )}
                </div>
                {holiday && (
                  <span className="text-xs text-destructive truncate">
                    {holiday.name}
                  </span>
                )}
                {entry?.status === 'finished' && (
                  <span className="text-[10px] text-muted-foreground">完了</span>
                )}
                {entry?.status === 'working' && (
                  <span className="text-[10px] text-primary">勤務中</span>
                )}
                {entry?.status === 'on_break' && (
                  <span className="text-[10px] text-muted-foreground">休憩中</span>
                )}
              </Link>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          日付をクリックで詳細へ。赤背景は公休日。
        </p>
      </CardContent>
    </Card>
  )
}

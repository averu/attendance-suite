import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { CalendarDays, List, Loader2 } from 'lucide-react'
import { z } from 'zod'
import {
  AttendanceCalendar,
  AttendanceMonthTable,
} from '@/features/attendance'
import { thisMonth } from '@/shared/lib/datetime'
import { Button } from '@/shared/ui/button'

const SearchSchema = z.object({
  yearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  view: z.enum(['table', 'calendar']).optional(),
})

export const Route = createFileRoute('/(app)/_authed/attendance/')({
  validateSearch: (s) => SearchSchema.parse(s),
  component: AttendanceScreen,
})

function AttendanceScreen() {
  const search = Route.useSearch()
  const yearMonth = search.yearMonth ?? thisMonth()
  const view = search.view ?? 'calendar'

  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">勤怠履歴</h1>
          <p className="text-muted-foreground">{yearMonth} の打刻記録</p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant={view === 'calendar' ? 'default' : 'outline'}
            size="sm"
          >
            <Link to="/attendance" search={{ yearMonth, view: 'calendar' }}>
              <CalendarDays />
              カレンダー
            </Link>
          </Button>
          <Button
            asChild
            variant={view === 'table' ? 'default' : 'outline'}
            size="sm"
          >
            <Link to="/attendance" search={{ yearMonth, view: 'table' }}>
              <List />
              テーブル
            </Link>
          </Button>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        {view === 'calendar' ? (
          <AttendanceCalendar yearMonth={yearMonth} />
        ) : (
          <AttendanceMonthTable yearMonth={yearMonth} />
        )}
      </Suspense>
    </section>
  )
}

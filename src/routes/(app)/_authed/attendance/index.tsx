import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { AttendanceMonthTable } from '@/features/attendance'
import { thisMonth } from '@/shared/lib/datetime'

const SearchSchema = z.object({
  yearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
})

export const Route = createFileRoute('/(app)/_authed/attendance/')({
  validateSearch: (s) => SearchSchema.parse(s),
  component: AttendanceScreen,
})

function AttendanceScreen() {
  const search = Route.useSearch()
  const yearMonth = search.yearMonth ?? thisMonth()
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">勤怠履歴</h1>
        <p className="text-muted-foreground">{yearMonth} の打刻記録</p>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <AttendanceMonthTable yearMonth={yearMonth} />
      </Suspense>
    </section>
  )
}

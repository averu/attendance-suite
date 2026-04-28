import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { MonthlySummaryTable } from '@/features/summary'
import { thisMonth } from '@/shared/lib/datetime'

const SearchSchema = z.object({
  yearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
})

export const Route = createFileRoute('/(app)/_authed/admin/summary')({
  validateSearch: (s) => SearchSchema.parse(s),
  component: SummaryScreen,
})

function SummaryScreen() {
  const search = Route.useSearch()
  const yearMonth = search.yearMonth ?? thisMonth()
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">月次集計</h1>
        <p className="text-muted-foreground">メンバーごとの労働時間サマリ</p>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <MonthlySummaryTable yearMonth={yearMonth} />
      </Suspense>
    </section>
  )
}

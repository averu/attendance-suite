import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CorrectionRequestForm } from '@/features/correction-request'
import { today } from '@/shared/lib/datetime'

const SearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute('/(app)/_authed/requests/new')({
  validateSearch: (s) => SearchSchema.parse(s),
  component: NewRequestScreen,
})

function NewRequestScreen() {
  const search = Route.useSearch()
  const defaultDate = search.date ?? today()
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">修正申請を作成</h1>
        <p className="text-muted-foreground">
          打刻ミス等の修正をマネージャーに申請します
        </p>
      </header>
      <CorrectionRequestForm defaultDate={defaultDate} />
    </section>
  )
}

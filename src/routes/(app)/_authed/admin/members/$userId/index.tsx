import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { AttendanceMonthTable } from '@/features/attendance'
import { organizationQueries } from '@/features/organization'
import { thisMonth } from '@/shared/lib/datetime'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'

const SearchSchema = z.object({
  yearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
})

export const Route = createFileRoute('/(app)/_authed/admin/members/$userId/')({
  validateSearch: (s) => SearchSchema.parse(s),
  component: MemberAttendanceScreen,
})

function MemberAttendanceScreen() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const yearMonth = search.yearMonth ?? thisMonth()

  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">メンバー勤怠</h1>
          <Suspense
            fallback={
              <p className="text-muted-foreground text-sm">読み込み中…</p>
            }
          >
            <MemberHeader userId={params.userId} yearMonth={yearMonth} />
          </Suspense>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/members">
            <ArrowLeft />
            メンバー一覧
          </Link>
        </Button>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <AttendanceMonthTable yearMonth={yearMonth} userId={params.userId} />
      </Suspense>
    </section>
  )
}

function MemberHeader({
  userId,
  yearMonth,
}: {
  userId: string
  yearMonth: string
}) {
  const { data: members } = useSuspenseQuery(organizationQueries.members())
  const m = members.find((mm) => mm.userId === userId)
  if (!m) {
    return (
      <p className="text-muted-foreground text-sm">
        該当メンバーが見つかりません ({userId})
      </p>
    )
  }
  return (
    <p className="text-muted-foreground flex items-center gap-2">
      <span>{m.name}</span>
      <Badge variant="outline" className="capitalize">
        {m.role}
      </Badge>
      <span>·</span>
      <span>{yearMonth}</span>
    </p>
  )
}

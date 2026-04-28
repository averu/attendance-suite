import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  AttendanceDayDetail,
  AttendanceEditForm,
  attendanceQueries,
} from '@/features/attendance'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute(
  '/(app)/_authed/admin/members/$userId/$date',
)({
  component: MemberDayScreen,
})

function MemberDayScreen() {
  const params = Route.useParams()
  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">勤怠詳細・編集</h1>
          <p className="text-muted-foreground">{params.date}</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/members/$userId" params={{ userId: params.userId }}>
            <ArrowLeft />
            月別一覧
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
        <DayDetailWithEdit userId={params.userId} workDate={params.date} />
      </Suspense>
    </section>
  )
}

function DayDetailWithEdit({
  userId,
  workDate,
}: {
  userId: string
  workDate: string
}) {
  const { data: entry } = useSuspenseQuery(
    attendanceQueries.detail(workDate, userId),
  )
  return (
    <div className="grid gap-6">
      <AttendanceDayDetail workDate={workDate} userId={userId} />
      <AttendanceEditForm
        userId={userId}
        workDate={workDate}
        initialEntry={entry}
      />
    </div>
  )
}

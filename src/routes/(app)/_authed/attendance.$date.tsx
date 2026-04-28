import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ArrowLeft, Loader2, FileEdit } from 'lucide-react'
import { AttendanceDayDetail } from '@/features/attendance'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/(app)/_authed/attendance/$date')({
  component: AttendanceDayScreen,
})

function AttendanceDayScreen() {
  const params = Route.useParams()
  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">勤怠詳細</h1>
          <p className="text-muted-foreground">{params.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/requests/new?date=${params.date}`}>
              <FileEdit />
              修正申請
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/attendance">
              <ArrowLeft />
              一覧へ
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
        <AttendanceDayDetail workDate={params.date} />
      </Suspense>
    </section>
  )
}

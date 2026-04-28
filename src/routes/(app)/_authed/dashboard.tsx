import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { AttendanceReminder, TodayCard } from '@/features/attendance'
import { MyMonthlySummaryCard } from '@/features/summary'
import { thisMonth } from '@/shared/lib/datetime'

export const Route = createFileRoute('/(app)/_authed/dashboard')({
  component: DashboardScreen,
})

function DashboardScreen() {
  const yearMonth = thisMonth()
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground">今日の打刻と今月の進捗</p>
      </header>
      <Suspense fallback={null}>
        <AttendanceReminder />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <TodayCard />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            月次サマリを読み込み中…
          </div>
        }
      >
        <MyMonthlySummaryCard yearMonth={yearMonth} />
      </Suspense>
    </section>
  )
}

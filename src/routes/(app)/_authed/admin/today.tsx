import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import {
  OrgSaburokuCard,
  OrgTodayDashboard,
  RecentTrendCard,
} from '@/features/admin-overview'

export const Route = createFileRoute('/(app)/_authed/admin/today')({
  component: AdminTodayScreen,
})

function AdminTodayScreen() {
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">今日の状況</h1>
        <p className="text-muted-foreground">
          組織全体のリアルタイム勤務状況
        </p>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <OrgTodayDashboard />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            推移を読み込み中…
          </div>
        }
      >
        <RecentTrendCard />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            36 協定アセスメントを集計中…
          </div>
        }
      >
        <OrgSaburokuCard />
      </Suspense>
    </section>
  )
}

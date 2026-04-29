import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { AdminLeaveList, OrgLeaveObligationsCard } from '@/features/leave-request'

export const Route = createFileRoute('/(app)/_authed/admin/leaves')({
  component: AdminLeavesScreen,
})

function AdminLeavesScreen() {
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">休暇の承認</h1>
        <p className="text-muted-foreground">
          未対応の休暇申請の審査と、年 5 日取得義務の進捗
        </p>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            年 5 日取得義務を集計中…
          </div>
        }
      >
        <OrgLeaveObligationsCard />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <AdminLeaveList />
      </Suspense>
    </section>
  )
}

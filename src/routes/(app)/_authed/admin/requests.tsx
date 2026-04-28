import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { AdminRequestList } from '@/features/correction-request'

export const Route = createFileRoute('/(app)/_authed/admin/requests')({
  component: AdminRequestsScreen,
})

function AdminRequestsScreen() {
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">申請の承認</h1>
        <p className="text-muted-foreground">未対応の修正申請を審査します</p>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <AdminRequestList />
      </Suspense>
    </section>
  )
}

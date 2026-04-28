import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { MyRequestList } from '@/features/correction-request'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/(app)/_authed/requests')({
  component: MyRequestsScreen,
})

function MyRequestsScreen() {
  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">修正申請</h1>
          <p className="text-muted-foreground">自分の修正申請の一覧</p>
        </div>
        <Button asChild>
          <Link to="/requests/new">
            <Plus />
            新規申請
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
        <MyRequestList />
      </Suspense>
    </section>
  )
}

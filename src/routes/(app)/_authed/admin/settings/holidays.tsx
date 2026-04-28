import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { HolidaysManager } from '@/features/holidays'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/(app)/_authed/admin/settings/holidays')({
  component: HolidaysScreen,
})

function HolidaysScreen() {
  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">公休 / 祝日</h1>
          <p className="text-muted-foreground">
            会社全体の休日マスタ。月次集計の所定労働日数から控除されます。
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/settings">
            <ArrowLeft />
            組織設定
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
        <HolidaysManager />
      </Suspense>
    </section>
  )
}

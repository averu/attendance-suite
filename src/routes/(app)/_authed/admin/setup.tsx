import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  BulkInviteForm,
  BulkMemberWorkProfileEditor,
} from '@/features/organization'
import { SyncAllLeaveGrantsCard } from '@/features/leave-request'
import {
  HolidaysManager,
  JapaneseHolidayPresetCard,
} from '@/features/holidays'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/(app)/_authed/admin/setup')({
  component: AdminSetupScreen,
})

function AdminSetupScreen() {
  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">初期セットアップ</h1>
          <p className="text-muted-foreground">
            メンバー労務情報・有給付与・公休日の一括登録
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/today">
            <ArrowLeft />
            管理画面トップ
          </Link>
        </Button>
      </header>
      <BulkInviteForm />
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            メンバー一覧を読み込み中…
          </div>
        }
      >
        <BulkMemberWorkProfileEditor />
      </Suspense>
      <SyncAllLeaveGrantsCard />
      <JapaneseHolidayPresetCard />
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            公休一覧を読み込み中…
          </div>
        }
      >
        <HolidaysManager />
      </Suspense>
    </section>
  )
}

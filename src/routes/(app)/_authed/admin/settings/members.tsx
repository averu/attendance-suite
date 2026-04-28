import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { InviteForm, MemberTable } from '@/features/organization'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/(app)/_authed/admin/settings/members')({
  component: SettingsMembersScreen,
})

function SettingsMembersScreen() {
  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">メンバー管理</h1>
          <p className="text-muted-foreground">招待・ロール変更・削除</p>
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
        <MemberTable canEdit={true} />
      </Suspense>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <InviteForm />
      </Suspense>
    </section>
  )
}

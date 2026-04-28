import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { MemberTable } from '@/features/organization'

export const Route = createFileRoute('/(app)/_authed/admin/members/')({
  component: MembersScreen,
})

function MembersScreen() {
  const { auth } = Route.useRouteContext()
  const isOwner = auth.membership?.role === 'owner'
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">メンバー</h1>
        <p className="text-muted-foreground">組織のメンバー一覧</p>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        }
      >
        <MemberTable canEdit={isOwner} />
      </Suspense>
      {isOwner && (
        <p className="text-sm text-muted-foreground">
          招待・ロール変更は&nbsp;
          <Link
            to="/admin/settings/members"
            className="text-foreground underline-offset-4 hover:underline"
          >
            組織設定
          </Link>
          &nbsp;から
        </p>
      )}
    </section>
  )
}

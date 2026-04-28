import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Clock } from 'lucide-react'

export const Route = createFileRoute('/(public)/')({
  beforeLoad: ({ context }) => {
    if (context.auth.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LandingScreen,
})

function LandingScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <Clock className="size-8" />
          <h1 className="text-4xl font-bold tracking-tight">勤怠管理</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          小規模チーム向けの軽量な勤怠管理ツール。
          <br />
          打刻・修正申請・月次集計まで、これ 1 つで。
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link to="/signup">無料で始める</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">ログイン</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { LeaveRequestForm } from '@/features/leave-request'

export const Route = createFileRoute('/(app)/_authed/leaves/new')({
  component: NewLeaveScreen,
})

function NewLeaveScreen() {
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">休暇申請を作成</h1>
        <p className="text-muted-foreground">
          有給・半休・特別休暇等を申請します
        </p>
      </header>
      <LeaveRequestForm />
    </section>
  )
}

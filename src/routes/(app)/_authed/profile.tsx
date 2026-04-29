import { createFileRoute } from '@tanstack/react-router'
import { ProfileSettings } from '@/features/auth'
import { OrganizationsPanel } from '@/features/organization'

export const Route = createFileRoute('/(app)/_authed/profile')({
  component: ProfileScreen,
})

function ProfileScreen() {
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">プロファイル</h1>
        <p className="text-muted-foreground">アカウントと所属組織の管理</p>
      </header>
      <ProfileSettings />
      <OrganizationsPanel />
    </section>
  )
}

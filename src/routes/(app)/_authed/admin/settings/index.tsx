import { createFileRoute, Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { OrganizationSettings } from '@/features/organization'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/(app)/_authed/admin/settings/')({
  component: SettingsScreen,
})

function SettingsScreen() {
  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">組織設定</h1>
          <p className="text-muted-foreground">組織情報の管理</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/settings/members">
            <Users />
            メンバー管理
          </Link>
        </Button>
      </header>
      <OrganizationSettings />
    </section>
  )
}

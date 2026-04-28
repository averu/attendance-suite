import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
} from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  CalendarDays,
  FileEdit,
  Plane,
  Users,
  Inbox,
  PlaneTakeoff,
  BarChart3,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react'
import { authClient } from '@/features/auth'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { Badge } from '@/shared/ui/badge'
import { ClientOnly } from '@/shared/ui/client-only'
import { cn } from '@/shared/lib/utils'

export const Route = createFileRoute('/(app)/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    if (!context.auth.membership) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  const { auth } = Route.useRouteContext()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isAdmin =
    auth.membership?.role === 'admin' || auth.membership?.role === 'owner'
  const isOwner = auth.membership?.role === 'owner'

  async function onSignOut() {
    await authClient.signOut()
    qc.clear()
    await navigate({ to: '/login' })
  }

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr]">
      <aside className="bg-sidebar text-sidebar-foreground border-r flex flex-col p-4 gap-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5" />
          <span className="font-semibold">{auth.organization?.name}</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="truncate">{auth.user?.email}</div>
          <Badge variant="secondary" className="capitalize">
            {auth.membership?.role}
          </Badge>
        </div>

        <Separator />

        <nav className="flex flex-col gap-1">
          <NavLink to="/dashboard" icon={<Clock className="size-4" />}>
            ダッシュボード
          </NavLink>
          <NavLink to="/attendance" icon={<CalendarDays className="size-4" />}>
            勤怠履歴
          </NavLink>
          <NavLink to="/requests" icon={<FileEdit className="size-4" />}>
            修正申請
          </NavLink>
          <NavLink to="/leaves" icon={<Plane className="size-4" />}>
            休暇申請
          </NavLink>
        </nav>

        {isAdmin && (
          <>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground px-2">管理</p>
            <nav className="flex flex-col gap-1">
              <NavLink to="/admin/members" icon={<Users className="size-4" />}>
                メンバー
              </NavLink>
              <NavLink to="/admin/requests" icon={<Inbox className="size-4" />}>
                修正申請の承認
              </NavLink>
              <NavLink to="/admin/leaves" icon={<PlaneTakeoff className="size-4" />}>
                休暇の承認
              </NavLink>
              <NavLink to="/admin/summary" icon={<BarChart3 className="size-4" />}>
                月次集計
              </NavLink>
              {isOwner && (
                <NavLink to="/admin/settings" icon={<Settings className="size-4" />}>
                  組織設定
                </NavLink>
              )}
            </nav>
          </>
        )}

        <div className="mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onSignOut}
            className="w-full"
          >
            <LogOut className="size-4" />
            サインアウト
          </Button>
        </div>
      </aside>

      <main className="bg-background">
        <div className="container mx-auto px-8 py-6">
          {/* authed page の中身は session cookie 必須の HTTP fetch を含むので
              SSR では描画せず、client mount 後に表示する */}
          <ClientOnly
            fallback={
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="size-4 animate-spin" />
                読み込み中…
              </div>
            }
          >
            <Outlet />
          </ClientOnly>
        </div>
      </main>
    </div>
  )
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: false }}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
      activeProps={{
        className: 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
      }}
    >
      {icon}
      {children}
    </Link>
  )
}

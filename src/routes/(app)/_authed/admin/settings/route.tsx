import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_authed/admin/settings')({
  beforeLoad: ({ context }) => {
    if (context.auth.membership?.role !== 'owner') {
      throw redirect({ to: '/admin/members' })
    }
  },
  component: () => <Outlet />,
})

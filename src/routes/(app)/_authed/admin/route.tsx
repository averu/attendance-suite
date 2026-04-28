import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_authed/admin')({
  // admin or owner のみ。server fn 側でも middleware で再検証する (二重防御)。
  beforeLoad: ({ context }) => {
    const role = context.auth.membership?.role
    if (role !== 'admin' && role !== 'owner') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})

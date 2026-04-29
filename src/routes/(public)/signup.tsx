import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { SignupForm } from '@/features/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'

const SearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(public)/signup')({
  validateSearch: (s) => SearchSchema.parse(s),
  beforeLoad: ({ context, search }) => {
    if (context.auth.user) {
      throw redirect({ to: search.redirect ?? '/dashboard' })
    }
  },
  component: SignupScreen,
})

function SignupScreen() {
  const search = Route.useSearch()
  // /invite/$token から来た場合は招待モード: 組織作成をスキップして招待先 org に参加させる
  const inviteRedirect =
    search.redirect && search.redirect.startsWith('/invite/')
      ? search.redirect
      : null
  const redirectTo = search.redirect ?? '/dashboard'

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">サインアップ</CardTitle>
          <CardDescription>
            {inviteRedirect
              ? '招待を受けた組織に参加します'
              : '最初のユーザーは組織を作成し、owner になります'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm
            redirectTo={redirectTo}
            mode={inviteRedirect ? 'invite' : 'bootstrap'}
          />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          既にアカウントがある場合は&nbsp;
          <Link
            to="/login"
            search={inviteRedirect ? { redirect: inviteRedirect } : undefined}
            className="underline-offset-4 hover:underline text-foreground"
          >
            ログイン
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}

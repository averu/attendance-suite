import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginForm } from '@/features/auth'
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

export const Route = createFileRoute('/(public)/login')({
  validateSearch: (s) => SearchSchema.parse(s),
  beforeLoad: ({ context, search }) => {
    if (context.auth.user) {
      throw redirect({ to: search.redirect ?? '/dashboard' })
    }
  },
  component: LoginScreen,
})

function LoginScreen() {
  const search = Route.useSearch()
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>
            登録済みの Email とパスワードでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={search.redirect ?? '/dashboard'} />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          アカウントが無い場合は&nbsp;
          <Link to="/signup" className="underline-offset-4 hover:underline text-foreground">
            サインアップ
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'
import { SignupForm } from '@/features/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'

export const Route = createFileRoute('/(public)/signup')({
  component: SignupScreen,
})

function SignupScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">サインアップ</CardTitle>
          <CardDescription>
            最初のユーザーは組織を作成し、owner になります
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          既にアカウントがある場合は&nbsp;
          <Link to="/login" className="underline-offset-4 hover:underline text-foreground">
            ログイン
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}

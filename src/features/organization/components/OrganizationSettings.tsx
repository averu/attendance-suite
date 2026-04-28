import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth'
import { useUpdateOrganization } from '../mutations'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function OrganizationSettings() {
  const session = useSession()
  const org = session.data.organization
  const [name, setName] = useState(org?.name ?? '')
  const [timezone, setTimezone] = useState(org?.timezone ?? 'Asia/Tokyo')
  const update = useUpdateOrganization()

  if (!org) return <p>組織が見つかりません。</p>

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await update.mutateAsync({ name, timezone })
      toast.success('保存しました')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>組織情報</CardTitle>
        <CardDescription>組織名とタイムゾーンを変更できます</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="org-name">組織名</Label>
            <Input
              id="org-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-tz">Timezone</Label>
            <Input
              id="org-tz"
              required
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            保存
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

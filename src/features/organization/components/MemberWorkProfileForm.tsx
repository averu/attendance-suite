import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateMemberWorkProfile } from '../mutations'
import type { Member } from '../types'
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

/**
 * 管理者がメンバーの労務情報 (雇入日・週所定日数・週所定時間) を編集する Card。
 * 値を空にすると null (未設定) として保存される。
 */
export function MemberWorkProfileForm({ member }: { member: Member }) {
  const update = useUpdateMemberWorkProfile()
  const [hireDate, setHireDate] = useState(member.hireDate ?? '')
  const [days, setDays] = useState(
    member.weeklyScheduledDays == null
      ? ''
      : String(member.weeklyScheduledDays),
  )
  const [hours, setHours] = useState(
    member.weeklyScheduledHours == null
      ? ''
      : String(member.weeklyScheduledHours),
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedDays = days === '' ? null : Number(days)
    const parsedHours = hours === '' ? null : Number(hours)
    if (parsedDays !== null && (Number.isNaN(parsedDays) || parsedDays < 0 || parsedDays > 7)) {
      toast.error('週所定日数は 0-7 の整数で入力してください')
      return
    }
    if (parsedHours !== null && (Number.isNaN(parsedHours) || parsedHours < 0 || parsedHours > 168)) {
      toast.error('週所定時間は 0-168 の数値で入力してください')
      return
    }
    try {
      await update.mutateAsync({
        membershipId: member.membershipId,
        hireDate: hireDate === '' ? null : hireDate,
        weeklyScheduledDays:
          parsedDays === null ? null : Math.floor(parsedDays),
        weeklyScheduledHours: parsedHours,
      })
      toast.success('労務情報を保存しました')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>労務情報</CardTitle>
        <CardDescription>
          雇入れ日と週所定 (日数・時間) は有給休暇の付与日数算定に使われます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor={`hire-${member.membershipId}`}>雇入れ日</Label>
            <Input
              id={`hire-${member.membershipId}`}
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`days-${member.membershipId}`}>週所定日数</Label>
              <Input
                id={`days-${member.membershipId}`}
                type="number"
                min={0}
                max={7}
                step={1}
                placeholder="5"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`hours-${member.membershipId}`}>
                週所定時間
              </Label>
              <Input
                id={`hours-${member.membershipId}`}
                type="number"
                min={0}
                max={168}
                step={0.5}
                placeholder="40"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                30h 以上または週 5 日以上 → 一般労働者として付与
              </p>
            </div>
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

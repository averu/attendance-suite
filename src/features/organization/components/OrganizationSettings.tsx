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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}:${String(mm).padStart(2, '0')}`
}

function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function OrganizationSettings() {
  const session = useSession()
  const org = session.data.organization
  const [name, setName] = useState(org?.name ?? '')
  const [timezone, setTimezone] = useState(org?.timezone ?? 'Asia/Tokyo')
  const [dailyHHMM, setDailyHHMM] = useState(
    minutesToHHMM(org?.dailyScheduledMinutes ?? 480),
  )
  const [weeklyHHMM, setWeeklyHHMM] = useState(
    minutesToHHMM(org?.weeklyScheduledMinutes ?? 2400),
  )
  const [legalHolidayDow, setLegalHolidayDow] = useState(
    String(org?.legalHolidayDow ?? 0),
  )
  const update = useUpdateOrganization()

  if (!org) return <p>組織が見つかりません。</p>

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dailyMin = hhmmToMinutes(dailyHHMM)
    const weeklyMin = hhmmToMinutes(weeklyHHMM)
    if (dailyMin === null || weeklyMin === null) {
      toast.error('労働時間は HH:MM 形式で入力してください')
      return
    }
    try {
      await update.mutateAsync({
        name,
        timezone,
        dailyScheduledMinutes: dailyMin,
        weeklyScheduledMinutes: weeklyMin,
        legalHolidayDow: Number(legalHolidayDow),
      })
      toast.success('保存しました')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>組織情報</CardTitle>
        <CardDescription>
          組織名・タイムゾーンと労働時間設定 (所定労働時間 / 法定休日曜日) を変更できます
        </CardDescription>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="org-daily">1 日所定 (HH:MM)</Label>
              <Input
                id="org-daily"
                required
                placeholder="8:00"
                value={dailyHHMM}
                onChange={(e) => setDailyHHMM(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                法定上限は 8:00 (法定外残業はこれを超えた分)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-weekly">1 週所定 (HH:MM)</Label>
              <Input
                id="org-weekly"
                required
                placeholder="40:00"
                value={weeklyHHMM}
                onChange={(e) => setWeeklyHHMM(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                法定上限は 40:00 (一部業種で 44:00 特例あり)
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-legal-holiday-dow">法定休日</Label>
            <Select
              value={legalHolidayDow}
              onValueChange={(v) => setLegalHolidayDow(v)}
            >
              <SelectTrigger id="org-legal-holiday-dow" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOW_LABELS.map((label, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {label}曜日
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              法定休日労働は 35% 割増の対象。慣例的に日曜日。
            </p>
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

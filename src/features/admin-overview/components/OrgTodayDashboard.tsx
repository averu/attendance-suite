import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Clock, MinusCircle, Users2 } from 'lucide-react'
import { adminOverviewQueries } from '../queries'
import type { OrgTodayMember } from '../types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { formatTime } from '@/shared/lib/datetime'

const STATUS_LABEL: Record<OrgTodayMember['status'], string> = {
  not_started: '未出勤',
  working: '勤務中',
  on_break: '休憩中',
  finished: '退勤済',
}

const STATUS_VARIANT: Record<
  OrgTodayMember['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  not_started: 'outline',
  working: 'default',
  on_break: 'secondary',
  finished: 'secondary',
}

function fmtMinutes(m: number): string {
  if (m === 0) return '-'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

export function OrgTodayDashboard() {
  const { data } = useSuspenseQuery(adminOverviewQueries.today())
  const { counts, members, date } = data

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat
          icon={<Users2 className="size-4" />}
          label="メンバー総数"
          value={counts.total}
        />
        <Stat
          icon={<Clock className="size-4" />}
          label="勤務中"
          value={counts.working}
          highlight={counts.working > 0}
        />
        <Stat
          icon={<CheckCircle2 className="size-4" />}
          label="退勤済"
          value={counts.finished}
        />
        <Stat
          icon={<MinusCircle className="size-4" />}
          label="未出勤"
          value={counts.notStarted}
        />
      </div>

      <Card>
        <CardHeader>
          <CardDescription>{date}</CardDescription>
          <CardTitle>メンバー別 今日の状況</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>出勤</TableHead>
                <TableHead>退勤</TableHead>
                <TableHead className="text-right">労働</TableHead>
                <TableHead className="text-right">休憩</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">
                    <Link
                      to="/admin/members/$userId"
                      params={{ userId: m.userId }}
                      className="underline-offset-4 hover:underline"
                    >
                      {m.userName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[m.status]}>
                      {STATUS_LABEL[m.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.clockInAt ? formatTime(new Date(m.clockInAt)) : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.clockOutAt ? formatTime(new Date(m.clockOutAt)) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMinutes(m.workingMinutes)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMinutes(m.breakMinutes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="bg-muted text-muted-foreground rounded-md p-2">
          {icon}
        </div>
        <div>
          <div className="text-muted-foreground text-xs">{label}</div>
          <div
            className={
              highlight
                ? 'text-2xl font-bold text-primary'
                : 'text-2xl font-bold'
            }
          >
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

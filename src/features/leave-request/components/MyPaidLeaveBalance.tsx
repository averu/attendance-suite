import { useSuspenseQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock } from 'lucide-react'
import { leaveRequestQueries } from '../queries'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

const OBLIGATION_BADGE: Record<
  'compliant' | 'violation' | 'pending',
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  compliant: { label: '達成', variant: 'secondary' },
  violation: { label: '未達', variant: 'destructive' },
  pending: { label: '進行中', variant: 'outline' },
}

export function MyPaidLeaveBalance() {
  const { data } = useSuspenseQuery(leaveRequestQueries.myBalance())

  if (data.status === 'UNCONFIGURED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>有給休暇 残高</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription>
              雇入れ日と週所定労働日数 / 時間が未設定のため残高を計算できません。
              管理者にメンバー設定の登録を依頼してください。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>有給休暇 残高</CardTitle>
          <CardDescription>
            雇入れ {data.hireDate} / 週 {data.weeklyScheduledDays} 日{' '}
            {data.weeklyScheduledHours} 時間
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="付与" value={data.totalGrantedActiveDays} suffix="日" />
            <Stat label="取得" value={data.totalUsedDays} suffix="日" />
            <Stat
              label="残"
              value={data.remainingDays}
              suffix="日"
              accent
            />
          </div>
          {data.unallocatedUsedDays > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                残高を超過 / 期限切れの取得が {data.unallocatedUsedDays} 日分あります。
                データを確認してください。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>付与単位の内訳</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.grants.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              まだ付与日は到達していません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>付与日</TableHead>
                  <TableHead>失効日</TableHead>
                  <TableHead className="text-right">付与</TableHead>
                  <TableHead className="text-right">取得</TableHead>
                  <TableHead className="text-right">残</TableHead>
                  <TableHead>状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.grants.map((g) => (
                  <TableRow key={g.grantDate}>
                    <TableCell className="font-mono">{g.grantDate}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {g.expiresAt}
                    </TableCell>
                    <TableCell className="text-right">{g.grantedDays}</TableCell>
                    <TableCell className="text-right">{g.usedDays}</TableCell>
                    <TableCell className="text-right font-medium">
                      {g.remainingDays}
                    </TableCell>
                    <TableCell>
                      {g.isExpired ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          失効
                        </Badge>
                      ) : (
                        <Badge variant="secondary">有効</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data.annualObligation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              年 5 日取得義務
            </CardTitle>
            <CardDescription>
              10 日以上付与された期間ごとに、付与日から 1 年以内に 5 日以上取得する義務
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>付与日</TableHead>
                  <TableHead>期間終了</TableHead>
                  <TableHead className="text-right">取得</TableHead>
                  <TableHead>判定</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.annualObligation.map((o) => {
                  const badge = OBLIGATION_BADGE[o.status]
                  return (
                    <TableRow key={o.grantDate}>
                      <TableCell className="font-mono">{o.grantDate}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {o.periodEndDate}
                      </TableCell>
                      <TableCell className="text-right">
                        {o.takenDays} / {o.obligedDays}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>
                          {o.status === 'compliant' ? (
                            <CheckCircle2 className="size-3" />
                          ) : o.status === 'violation' ? (
                            <AlertTriangle className="size-3" />
                          ) : (
                            <Clock className="size-3" />
                          )}
                          {badge.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: number
  suffix: string
  accent?: boolean
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={accent ? 'text-2xl font-bold' : 'text-2xl'}>
        {value}
        <span className="text-sm font-normal text-muted-foreground">
          {' '}
          {suffix}
        </span>
      </span>
    </div>
  )
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { adminOverviewQueries } from '../queries'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h}h${min ? ` ${min}m` : ''}`
}

/**
 * 36 協定アセスメント card。
 * 過去 12 ヶ月分の各メンバー法定外残業 / 法定休日労働を集計し、原則 (45h/360h) と
 * 特別条項 (100h/80h-avg/720h/年6回) の上限超過を一覧表示する。
 */
export function OrgSaburokuCard() {
  const { data } = useSuspenseQuery(adminOverviewQueries.saburoku())

  const violations = data.members.filter((m) => m.severity === 'violation')
  const warnings = data.members.filter((m) => m.severity === 'warning')
  const cleanCount = data.members.filter((m) => m.severity === 'clean').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4" />
          36 協定アラート
        </CardTitle>
        <CardDescription>
          {data.windowStartYearMonth} 〜 {data.asOfYearMonth} の 12 ヶ月: 月45h/年360h (原則) と特別条項 (月100h未満/年720h/平均80h/年6回)
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            違反 {violations.length} 名
          </Badge>
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700">
            <AlertTriangle className="size-3" />
            警告 (45h 超月あり) {warnings.length} 名
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3" />
            問題なし {cleanCount} 名
          </Badge>
        </div>

        {(violations.length > 0 || warnings.length > 0) && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メンバー</TableHead>
                <TableHead className="text-right">年累計 法定外</TableHead>
                <TableHead className="text-right">45h 超月数</TableHead>
                <TableHead>違反内訳</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...violations, ...warnings].map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">{m.userName}</TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMinutes(m.finding.annualLegalOvertimeMinutes)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {m.finding.specialClauseInvocationCount} 回
                  </TableCell>
                  <TableCell className="text-xs">
                    {summarizeReasons(m.finding)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        m.severity === 'violation' ? 'destructive' : 'outline'
                      }
                    >
                      {m.severity === 'violation' ? '違反' : '警告'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {violations.length === 0 && warnings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            違反 / 警告はありません
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function summarizeReasons(
  f: import('../types').OrgSaburokuMemberFindingDTO['finding'],
): string {
  const reasons: string[] = []
  if (f.exceedsAnnual360h) reasons.push('年 360h 超')
  if (f.exceedsAnnual720h) reasons.push('年 720h 超')
  if (f.exceedsSpecialClauseInvocationLimit) reasons.push('特別条項 6 回超')
  if (f.exceedsRollingAverage80h) reasons.push('複数月平均 80h 超')
  if (f.monthlyFindings.some((m) => m.exceedsMonthly100h)) reasons.push('月 100h 以上')
  if (
    reasons.length === 0 &&
    f.monthlyFindings.some((m) => m.exceedsMonthly45h)
  ) {
    reasons.push('月 45h 超 (特別条項発動)')
  }
  return reasons.join(' / ')
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { leaveRequestQueries } from '../queries'
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

/**
 * org 全メンバーの「年 5 日取得義務」状況を一覧する admin 向けカード。
 *
 * 表示優先度:
 *   1. violation (期間終了して未達) → 違反、対応必須
 *   2. pending (進行中で 5 日未達) → 残期間で達成させる
 *   3. compliant (達成済) → 件数だけサマリ
 *   4. UNCONFIGURED → membership 設定未済で算定不能
 */
export function OrgLeaveObligationsCard() {
  const { data: items } = useSuspenseQuery(leaveRequestQueries.orgObligations())

  const violations: Array<{
    user: (typeof items)[number]
    o: (typeof items)[number]['obligations'][number]
  }> = []
  const pendings: typeof violations = []
  let compliantUserCount = 0
  const unconfigured: typeof items = []
  for (const u of items) {
    if (u.isUnconfigured) {
      unconfigured.push(u)
      continue
    }
    if (u.violationCount === 0 && u.pendingCount === 0 && u.obligations.length > 0) {
      compliantUserCount += 1
    }
    for (const o of u.obligations) {
      if (o.status === 'violation') violations.push({ user: u, o })
      else if (o.status === 'pending') pendings.push({ user: u, o })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" />
          年 5 日取得義務
        </CardTitle>
        <CardDescription>
          10 日以上付与された各期間で、付与日から 1 年以内に 5 日以上取得させる義務 (労基法 39 条 7 項)
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            違反 {violations.length}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            進行中 (未達) {pendings.length}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3" />
            達成 {compliantUserCount} 名
          </Badge>
          {unconfigured.length > 0 && (
            <Badge variant="outline">
              未設定 {unconfigured.length} 名 (雇入日未登録)
            </Badge>
          )}
        </div>

        {(violations.length > 0 || pendings.length > 0) && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メンバー</TableHead>
                <TableHead>付与日</TableHead>
                <TableHead>期間終了</TableHead>
                <TableHead className="text-right">取得</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map(({ user, o }) => (
                <TableRow key={`${user.userId}-${o.grantDate}-v`}>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell className="font-mono">{o.grantDate}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {o.periodEndDate}
                  </TableCell>
                  <TableCell className="text-right">
                    {o.takenDays} / {o.obligedDays}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">違反</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {pendings.map(({ user, o }) => (
                <TableRow key={`${user.userId}-${o.grantDate}-p`}>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell className="font-mono">{o.grantDate}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {o.periodEndDate}
                  </TableCell>
                  <TableCell className="text-right">
                    {o.takenDays} / {o.obligedDays}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">進行中</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {violations.length === 0 && pendings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            違反 / 進行中の対象者はいません
          </p>
        )}
      </CardContent>
    </Card>
  )
}

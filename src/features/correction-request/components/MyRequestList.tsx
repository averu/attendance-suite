import { useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { correctionRequestQueries } from '../queries'
import { useCancelCorrectionRequest } from '../mutations'
import type { CorrectionStatus } from '../types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'

const STATUS_LABEL: Record<CorrectionStatus, string> = {
  pending: '審査待ち',
  approved: '承認',
  rejected: '却下',
  cancelled: 'キャンセル',
}

const STATUS_VARIANT: Record<
  CorrectionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'default',
  approved: 'secondary',
  rejected: 'destructive',
  cancelled: 'outline',
}

export function MyRequestList() {
  const { data: items } = useSuspenseQuery(correctionRequestQueries.mine())
  const cancel = useCancelCorrectionRequest()

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          申請はまだありません
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>対象日</TableHead>
              <TableHead>理由</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.targetDate}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(r.createdAt).toLocaleString('ja-JP')}
                </TableCell>
                <TableCell>
                  {r.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancel.isPending}
                      onClick={() =>
                        cancel.mutate(
                          { requestId: r.id },
                          {
                            onSuccess: () => toast.success('キャンセルしました'),
                            onError: (e) => toast.error((e as Error).message),
                          },
                        )
                      }
                    >
                      キャンセル
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

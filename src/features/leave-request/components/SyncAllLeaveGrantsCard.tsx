import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useSyncAutoLeaveGrants } from '../mutations'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'

/**
 * 全メンバーの auto 有給付与を一括同期する admin アクション。
 * 雇入日 + 週所定が登録済みのメンバーのみが対象 (未設定はスキップ)。
 */
export function SyncAllLeaveGrantsCard() {
  const sync = useSyncAutoLeaveGrants()

  function onSync() {
    sync.mutate(
      {}, // userId 省略 = 全員
      {
        onSuccess: (r) =>
          toast.success(
            r.syncedCount > 0
              ? `${r.syncedCount} 件の自動付与を生成しました`
              : '追加すべき自動付与はありません',
          ),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>全員の有給を自動同期</CardTitle>
        <CardDescription>
          雇入日 + 週所定が設定済みの全メンバーについて、未登録の自動付与を生成します。
          既存の手動付与は影響を受けません。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={onSync} disabled={sync.isPending}>
          {sync.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          自動同期を実行
        </Button>
      </CardContent>
    </Card>
  )
}

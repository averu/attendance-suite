import { useMemo, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { generateJapaneseHolidays } from '../japaneseHolidays'
import { useBulkCreateHolidays } from '../mutations'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'

const NOW_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => NOW_YEAR - 1 + i)

/**
 * 日本の国民の祝日を年単位でプリセット投入する admin Card。
 * - 既存の (org × date) と重複する分は skip
 * - 振替休日も自動で含む (祝日が日曜の場合)
 */
export function JapaneseHolidayPresetCard() {
  const [year, setYear] = useState(String(NOW_YEAR))
  const bulk = useBulkCreateHolidays()
  const preview = useMemo(() => generateJapaneseHolidays(Number(year)), [year])

  function onApply() {
    bulk.mutate(
      { items: preview },
      {
        onSuccess: (r) =>
          toast.success(
            `${r.insertedCount} 件追加${r.skippedCount > 0 ? `、${r.skippedCount} 件は既存のためスキップ` : ''}`,
          ),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              日本の祝日プリセット
            </CardTitle>
            <CardDescription>
              年を選んで国民の祝日を一括登録 (振替休日含む)。重複は skip されるので何度でも安全に実行可能。
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={year} onValueChange={(v) => setYear(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={onApply}
              disabled={bulk.isPending}
            >
              {bulk.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              登録
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {preview.map((h) => (
            <Badge
              key={`${h.date}-${h.name}`}
              variant="outline"
              className="font-normal"
              title={h.date}
            >
              <span className="font-mono mr-1.5 text-muted-foreground">
                {h.date.slice(5)}
              </span>
              {h.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

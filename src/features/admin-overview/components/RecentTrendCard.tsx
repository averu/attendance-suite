import { useSuspenseQuery } from '@tanstack/react-query'
import { adminOverviewQueries } from '../queries'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'

function fmtMinutes(m: number): string {
  if (m === 0) return '-'
  const h = Math.floor(m / 60)
  const min = m % 60
  return min === 0 ? `${h}h` : `${h}h${min}m`
}

const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土']

export function RecentTrendCard({ days = 7 }: { days?: number }) {
  const { data } = useSuspenseQuery(adminOverviewQueries.recentTrend(days))

  const maxMembers = Math.max(1, ...data.map((d) => d.workingMembers))
  const maxMinutes = Math.max(1, ...data.map((d) => d.totalWorkingMinutes))

  return (
    <Card>
      <CardHeader>
        <CardDescription>過去 {days} 日</CardDescription>
        <CardTitle>組織全体の推移</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Section
          title="出勤者数"
          unit="人"
          points={data.map((d) => ({
            workDate: d.workDate,
            value: d.workingMembers,
            display: `${d.workingMembers}人`,
          }))}
          max={maxMembers}
        />
        <Section
          title="合計労働時間"
          unit="h"
          points={data.map((d) => ({
            workDate: d.workDate,
            value: d.totalWorkingMinutes,
            display: fmtMinutes(d.totalWorkingMinutes),
          }))}
          max={maxMinutes}
        />
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  unit,
  points,
  max,
}: {
  title: string
  unit: string
  points: { workDate: string; value: number; display: string }[]
  max: number
}) {
  return (
    <div className="grid gap-2" role="group" aria-label={title}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className="text-xs text-muted-foreground">最大 {max} {unit}</span>
      </div>
      <div
        className="grid gap-2"
        role="img"
        aria-label={`${title}の過去 ${points.length} 日推移`}
        style={{
          gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
        }}
      >
        {points.map((p) => {
          const pct = max > 0 ? Math.round((p.value / max) * 100) : 0
          const dow = new Date(`${p.workDate}T00:00:00Z`).getUTCDay()
          return (
            <div
              key={p.workDate}
              className="flex flex-col items-center gap-1 text-xs"
            >
              <div className="font-mono">{p.display}</div>
              <div className="bg-muted w-full h-20 rounded-sm flex items-end overflow-hidden">
                <div
                  className="bg-primary w-full transition-all"
                  style={{ height: `${pct}%` }}
                  aria-label={`${title} ${p.display}`}
                />
              </div>
              <div className="text-muted-foreground">
                {p.workDate.slice(5).replace('-', '/')}
              </div>
              <div
                className={
                  dow === 0
                    ? 'text-destructive text-[10px]'
                    : dow === 6
                      ? 'text-blue-600 text-[10px]'
                      : 'text-muted-foreground text-[10px]'
                }
              >
                {WEEKDAY_LABEL[dow]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

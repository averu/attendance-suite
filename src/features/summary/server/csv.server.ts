import { getOrgMonthlySummaryHandler } from './handlers.server'
import { summaryCsvFilename, summaryToCsv } from '../csv'
import type { ApiCallerContext } from '@/shared/server/apiAuth'

export async function buildOrgMonthlySummaryCsv(
  ctx: ApiCallerContext,
  yearMonth: string,
): Promise<{ filename: string; body: string }> {
  const summary = await getOrgMonthlySummaryHandler(ctx, yearMonth)
  return {
    filename: summaryCsvFilename(ctx.organization.slug, summary.yearMonth),
    body: summaryToCsv(summary),
  }
}

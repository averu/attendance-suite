// 軽量 CSV ビルダ。Excel が UTF-8 をそのまま開けないので BOM 付きで生成する。
// RFC 4180 準拠: ダブルクオート/カンマ/改行を含むセルは "..." で囲み内部の " は "" に escape。

export const CSV_BOM = '﻿'

const NEEDS_QUOTE = /[",\r\n]/

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'string' ? value : String(value)
  if (NEEDS_QUOTE.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function buildCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: ReadonlyArray<{ key: keyof T; header: string }>,
): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(',')
  const bodyLines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(','),
  )
  return CSV_BOM + [headerLine, ...bodyLines].join('\r\n') + '\r\n'
}

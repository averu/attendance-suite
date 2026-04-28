import { describe, expect, it } from 'vitest'
import { CSV_BOM, buildCsv } from './csv'

describe('buildCsv', () => {
  type Row = { name: string; n: number; flag: boolean | null }
  const cols = [
    { key: 'name', header: '名前' },
    { key: 'n', header: '数値' },
    { key: 'flag', header: 'フラグ' },
  ] as const satisfies ReadonlyArray<{ key: keyof Row; header: string }>

  it('BOM 付きで出力する (Excel 日本語対応)', () => {
    const out = buildCsv<Row>([], cols)
    expect(out.startsWith(CSV_BOM)).toBe(true)
  })

  it('CRLF 改行で区切る', () => {
    const out = buildCsv<Row>([{ name: 'a', n: 1, flag: true }], cols)
    expect(out).toContain('\r\n')
    expect(out.endsWith('\r\n')).toBe(true)
  })

  it('header と body 行を順番通りに並べる', () => {
    const out = buildCsv<Row>(
      [
        { name: 'a', n: 1, flag: true },
        { name: 'b', n: 2, flag: false },
      ],
      cols,
    )
    const lines = out.replace(CSV_BOM, '').split('\r\n').filter(Boolean)
    expect(lines).toEqual(['名前,数値,フラグ', 'a,1,true', 'b,2,false'])
  })

  it('null / undefined は空セル', () => {
    const out = buildCsv<Row>([{ name: 'a', n: 0, flag: null }], cols)
    expect(out).toContain('a,0,\r\n')
  })

  it('カンマを含むセルは double-quote で囲む', () => {
    const out = buildCsv<Row>([{ name: 'a,b', n: 1, flag: true }], cols)
    expect(out).toContain('"a,b",1,true')
  })

  it('double-quote は "" にエスケープする', () => {
    const out = buildCsv<Row>([{ name: 'he said "hi"', n: 1, flag: true }], cols)
    expect(out).toContain('"he said ""hi""",1,true')
  })

  it('改行を含むセルは double-quote で囲む', () => {
    const out = buildCsv<Row>([{ name: 'line1\nline2', n: 1, flag: true }], cols)
    expect(out).toContain('"line1\nline2",1,true')
  })

  it('CRLF を含むセルも double-quote で囲む (CSV 行区切りと衝突しない)', () => {
    const out = buildCsv<Row>([{ name: 'line1\r\nline2', n: 1, flag: true }], cols)
    expect(out).toContain('"line1\r\nline2",1,true')
  })

  it('空配列でも header だけ出力する', () => {
    const out = buildCsv<Row>([], cols)
    expect(out).toBe(CSV_BOM + '名前,数値,フラグ\r\n')
  })
})

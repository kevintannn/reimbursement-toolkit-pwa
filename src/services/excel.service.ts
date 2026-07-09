import ExcelJS from 'exceljs'
import type { Expense } from '../types/expense'
import type { BatchInfo, CategoryTotal } from '../types/batch'
import { formatDisplayDate, formatDateRange } from '../utils/date'
import { buildCategoryTotals, sortExpensesForBatch } from './batch.service'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true }
const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' },
}
const GRAND_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' },
}

function borderAll(): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFCBD5E1' } }
  return { top: side, left: side, bottom: side, right: side }
}

function currencyCell(sheet: ExcelJS.Worksheet, row: number, col: number, value: number) {
  const cell = sheet.getCell(row, col)
  cell.value = value
  cell.numFmt = '#,##0'
  cell.border = borderAll()
}

export async function generateExcel(info: BatchInfo, expenses: Expense[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reimbursement Toolkit PWA'
  wb.created = new Date()

  const sorted = sortExpensesForBatch(expenses)
  const totals = buildCategoryTotals(expenses)
  const grandTotal = totals.reduce((s, ct) => s + ct.total, 0)

  buildSummarySheet(wb, info, totals, grandTotal)
  buildDetailSheet(wb, sorted)
  buildCategorizedSheet(wb, sorted, totals, grandTotal)

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function buildSummarySheet(
  wb: ExcelJS.Workbook,
  info: BatchInfo,
  totals: CategoryTotal[],
  grandTotal: number
) {
  const ws = wb.addWorksheet('Summary')
  ws.columns = [{ width: 30 }, { width: 20 }]

  let row = 1
  const titleCell = ws.getCell(row, 1)
  titleCell.value = info.name
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } }
  ws.mergeCells(row, 1, row, 2)
  row++

  ws.getCell(row, 1).value = formatDateRange(info.dateFrom, info.dateTo)
  ws.getCell(row, 1).font = { italic: true, color: { argb: 'FF64748B' } }
  ws.mergeCells(row, 1, row, 2)
  row += 2

  const hRow = ws.getRow(row)
  hRow.getCell(1).value = '类别'
  hRow.getCell(2).value = '金额'
  hRow.eachCell((cell) => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT; cell.border = borderAll() })
  row++

  for (const ct of totals) {
    ws.getCell(row, 1).value = ct.category
    ws.getCell(row, 1).border = borderAll()
    currencyCell(ws, row, 2, ct.total)
    row++
  }

  const gRow = ws.getRow(row)
  gRow.getCell(1).value = '总计'
  gRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  gRow.getCell(1).fill = GRAND_FILL
  gRow.getCell(1).border = borderAll()
  gRow.getCell(2).value = grandTotal
  gRow.getCell(2).numFmt = '#,##0'
  gRow.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  gRow.getCell(2).fill = GRAND_FILL
  gRow.getCell(2).border = borderAll()
}

function buildDetailSheet(wb: ExcelJS.Workbook, sorted: Expense[]) {
  const ws = wb.addWorksheet('Detail')
  ws.columns = [
    { header: '日期', key: 'date', width: 14 },
    { header: '用途', key: 'usage', width: 40 },
    { header: '金额', key: 'amount', width: 18 },
    { header: '类别', key: 'category', width: 22 },
  ]

  ws.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL; cell.font = HEADER_FONT; cell.border = borderAll()
  })

  sorted.forEach((exp, i) => {
    const r = ws.getRow(i + 2)
    r.getCell(1).value = formatDisplayDate(exp.date)
    r.getCell(2).value = exp.usage
    r.getCell(3).value = exp.amount
    r.getCell(3).numFmt = '#,##0'
    r.getCell(4).value = exp.category
    r.eachCell((cell) => { cell.border = borderAll() })
  })
}

function buildCategorizedSheet(
  wb: ExcelJS.Workbook,
  sorted: Expense[],
  totals: CategoryTotal[],
  grandTotal: number
) {
  const ws = wb.addWorksheet('预支费用')
  ws.columns = [
    { width: 14 }, { width: 40 }, { width: 18 }, { width: 22 },
  ]

  let row = 1
  const expenseMap = new Map(sorted.map((e) => [e.id, e]))

  for (const ct of totals) {
    const catCell = ws.getCell(row, 1)
    catCell.value = ct.category
    catCell.font = { bold: true, size: 12 }
    ws.mergeCells(row, 1, row, 4)
    row++

    const hRow = ws.getRow(row)
    ;['日期', '用途', '金额', ''].forEach((h, c) => {
      const cell = hRow.getCell(c + 1)
      cell.value = h
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = borderAll()
    })
    row++

    for (const id of ct.expenses) {
      const exp = expenseMap.get(id)
      if (!exp) continue
      ws.getCell(row, 1).value = formatDisplayDate(exp.date)
      ws.getCell(row, 2).value = exp.usage
      ws.getCell(row, 3).value = exp.amount
      ws.getCell(row, 3).numFmt = '#,##0'
      ws.getRow(row).eachCell((cell) => { cell.border = borderAll() })
      row++
    }

    const stRow = ws.getRow(row)
    stRow.getCell(2).value = `${ct.category}总额`
    stRow.getCell(2).font = { bold: true }
    stRow.getCell(2).fill = SUBTOTAL_FILL
    stRow.getCell(3).value = ct.total
    stRow.getCell(3).numFmt = '#,##0'
    stRow.getCell(3).font = { bold: true }
    stRow.getCell(3).fill = SUBTOTAL_FILL
    stRow.eachCell((cell) => { cell.border = borderAll() })
    row += 2
  }

  const gtRow = ws.getRow(row)
  gtRow.getCell(2).value = '总计'
  gtRow.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  gtRow.getCell(2).fill = GRAND_FILL
  gtRow.getCell(2).border = borderAll()
  gtRow.getCell(3).value = grandTotal
  gtRow.getCell(3).numFmt = '#,##0'
  gtRow.getCell(3).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  gtRow.getCell(3).fill = GRAND_FILL
  gtRow.getCell(3).border = borderAll()
}

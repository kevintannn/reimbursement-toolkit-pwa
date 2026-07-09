import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, PageSizes } from 'pdf-lib'
import type { RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Expense } from '../types/expense'
import type { BatchInfo, CategoryTotal } from '../types/batch'
import { formatDisplayDate, formatDateRange } from '../utils/date'
import { formatRupiah } from '../utils/currency'
import { buildCategoryTotals, sortExpensesForBatch } from './batch.service'
import { blobToArrayBuffer } from '../utils/image'
import { loadCJKFont } from './font.service'

const BLUE = rgb(0.118, 0.251, 0.686)
const LIGHT_BLUE = rgb(0.859, 0.929, 1)
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)
const GRAY = rgb(0.392, 0.455, 0.545)

// CJK Unicode ranges (CJK Unified, Hangul, CJK Compatibility, Katakana/Hiragana, fullwidth forms)
const CJK_RE = /[　-鿿가-힯豈-﫿一-鿿＀-￯]/

function hasCJK(text: string): boolean {
  return CJK_RE.test(text)
}

// Splits text into alternating Latin/CJK segments and draws each with the correct font,
// advancing x automatically so mixed strings (e.g. "买家 Lunch") render correctly.
function drawMixed(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  latinFont: PDFFont,
  cjkFont: PDFFont,
  color: RGB
) {
  if (!text) return

  // Build segments: [{text, isCJK}, ...]
  const segments: { text: string; isCJK: boolean }[] = []
  let buf = ''
  let lastCJK = CJK_RE.test(text[0])

  for (const ch of text) {
    const isCJK = CJK_RE.test(ch)
    if (isCJK !== lastCJK) {
      segments.push({ text: buf, isCJK: lastCJK })
      buf = ch
      lastCJK = isCJK
    } else {
      buf += ch
    }
  }
  if (buf) segments.push({ text: buf, isCJK: lastCJK })

  let curX = x
  for (const seg of segments) {
    const font = seg.isCJK ? cjkFont : latinFont
    page.drawText(seg.text, { x: curX, y, size, font, color })
    curX += font.widthOfTextAtSize(seg.text, size)
  }
}

export async function generatePDF(info: BatchInfo, expenses: Expense[]): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  // Latin/ASCII font — built-in, always correct encoding
  const latinR = await doc.embedFont(StandardFonts.Helvetica)
  const latinB = await doc.embedFont(StandardFonts.HelveticaBold)

  // CJK font — needed when any user-visible text contains Chinese/Japanese/Korean
  const anyNeedsCJK =
    hasCJK(info.name) ||
    expenses.some((e) => hasCJK(e.usage) || hasCJK(e.category))
  let cjkR: PDFFont
  let cjkB: PDFFont
  if (anyNeedsCJK) {
    const fontBytes = await loadCJKFont()
    cjkR = await doc.embedFont(fontBytes)
    cjkB = cjkR
  } else {
    cjkR = latinR
    cjkB = latinB
  }

  const sorted = sortExpensesForBatch(expenses)
  const totals = buildCategoryTotals(expenses)
  const grandTotal = totals.reduce((s, ct) => s + ct.total, 0)

  addSummaryPage(doc, info, totals, grandTotal, latinR, latinB, cjkR, cjkB)
  addCategorizedPage(doc, sorted, totals, grandTotal, latinR, latinB, cjkR, cjkB)

  for (const exp of sorted) {
    await addReceiptPage(doc, exp)
  }

  const bytes = await doc.save()
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}

function addSummaryPage(
  doc: PDFDocument,
  info: BatchInfo,
  totals: CategoryTotal[],
  grandTotal: number,
  latinR: PDFFont,
  latinB: PDFFont,
  cjkR: PDFFont,
  cjkB: PDFFont
) {
  const margin = 50
  const colW = 200
  const BOTTOM = 60

  let page = doc.addPage(PageSizes.A4)
  const { width, height } = page.getSize()
  let y = height - margin

  // Title bar + date range (first page only)
  page.drawRectangle({ x: margin, y: y - 40, width: width - margin * 2, height: 40, color: BLUE })
  drawMixed(page, info.name, margin + 10, y - 27, 18, latinB, cjkB, WHITE)
  y -= 60
  page.drawText(formatDateRange(info.dateFrom, info.dateTo), {
    x: margin + 10, y, size: 11, font: latinR, color: GRAY,
  })
  y -= 30

  // Column header — reused on every new page
  const drawColHeader = () => {
    page.drawRectangle({ x: margin, y: y - 20, width: width - margin * 2, height: 20, color: BLUE })
    drawMixed(page, '类别', margin + 8, y - 14, 11, latinB, cjkB, WHITE)
    drawMixed(page, '金额', margin + colW + 8, y - 14, 11, latinB, cjkB, WHITE)
    y -= 22
  }
  drawColHeader()

  totals.forEach((ct, i) => {
    if (y - 18 < BOTTOM) {
      page = doc.addPage(PageSizes.A4)
      y = height - margin
      drawColHeader()
    }
    const bg = i % 2 === 0 ? WHITE : LIGHT_BLUE
    page.drawRectangle({ x: margin, y: y - 18, width: width - margin * 2, height: 18, color: bg })
    drawMixed(page, ct.category, margin + 8, y - 13, 10, latinR, cjkR, BLACK)
    page.drawText(formatRupiah(ct.total), { x: margin + colW + 8, y: y - 13, size: 10, font: latinR, color: BLACK })
    y -= 20
  })

  if (y - 20 < BOTTOM) {
    page = doc.addPage(PageSizes.A4)
    y = height - margin
  }
  page.drawRectangle({ x: margin, y: y - 20, width: width - margin * 2, height: 20, color: BLUE })
  drawMixed(page, '总计', margin + 8, y - 14, 11, latinB, cjkB, WHITE)
  page.drawText(formatRupiah(grandTotal), { x: margin + colW + 8, y: y - 14, size: 11, font: latinB, color: WHITE })
}

function addCategorizedPage(
  doc: PDFDocument,
  sorted: Expense[],
  totals: CategoryTotal[],
  grandTotal: number,
  latinR: PDFFont,
  latinB: PDFFont,
  cjkR: PDFFont,
  cjkB: PDFFont
) {
  const margin = 50
  const BOTTOM = 60

  let page = doc.addPage(PageSizes.A4)
  const { width, height } = page.getSize()
  let y = height - margin

  // Title (first page only)
  const titleW = cjkB.widthOfTextAtSize('预支费用', 16)
  drawMixed(page, '预支费用', (width - titleW) / 2, y, 16, latinB, cjkB, BLUE)
  y -= 30

  const expenseMap = new Map(sorted.map((e) => [e.id, e]))

  // Column headers — reused whenever we continue on a new page mid-category
  const drawColHeaders = () => {
    page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: LIGHT_BLUE })
    drawMixed(page, '日期', margin + 6, y - 10, 9, latinB, cjkB, BLACK)
    drawMixed(page, '用途', margin + 80, y - 10, 9, latinB, cjkB, BLACK)
    drawMixed(page, '金额', width - margin - 90, y - 10, 9, latinB, cjkB, BLACK)
    y -= 16
  }

  for (const ct of totals) {
    // Need room for: category header (18) + col headers (16) + at least 1 row (14)
    if (y - 48 < BOTTOM) {
      page = doc.addPage(PageSizes.A4)
      y = height - margin
    }

    // Category header
    page.drawRectangle({ x: margin, y: y - 16, width: width - margin * 2, height: 16, color: BLUE })
    drawMixed(page, ct.category, margin + 6, y - 12, 10, latinB, cjkB, WHITE)
    y -= 18

    drawColHeaders()

    for (const id of ct.expenses) {
      const exp = expenseMap.get(id)
      if (!exp) continue

      if (y - 14 < BOTTOM) {
        page = doc.addPage(PageSizes.A4)
        y = height - margin
        drawColHeaders()
      }

      page.drawText(formatDisplayDate(exp.date), { x: margin + 6, y: y - 10, size: 9, font: latinR, color: BLACK })
      const usageText = exp.usage.length > 55 ? exp.usage.slice(0, 52) + '…' : exp.usage
      drawMixed(page, usageText, margin + 80, y - 10, 9, latinR, cjkR, BLACK)
      page.drawText(formatRupiah(exp.amount), { x: width - margin - 90, y: y - 10, size: 9, font: latinR, color: BLACK })
      y -= 14
    }

    // Subtotal
    if (y - 14 < BOTTOM) {
      page = doc.addPage(PageSizes.A4)
      y = height - margin
    }
    page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: LIGHT_BLUE })
    drawMixed(page, `${ct.category}总额`, margin + 80, y - 10, 9, latinB, cjkB, BLACK)
    page.drawText(formatRupiah(ct.total), { x: width - margin - 90, y: y - 10, size: 9, font: latinB, color: BLACK })
    y -= 20
  }

  // Grand total
  if (y - 16 < BOTTOM) {
    page = doc.addPage(PageSizes.A4)
    y = height - margin
  }
  page.drawRectangle({ x: margin, y: y - 16, width: width - margin * 2, height: 16, color: BLUE })
  drawMixed(page, '总计', margin + 80, y - 12, 10, latinB, cjkB, WHITE)
  page.drawText(formatRupiah(grandTotal), { x: width - margin - 90, y: y - 12, size: 10, font: latinB, color: WHITE })
}

async function addReceiptPage(doc: PDFDocument, exp: Expense) {
  const page = doc.addPage(PageSizes.A4)
  const { width, height } = page.getSize()
  const margin = 20

  const buf = await blobToArrayBuffer(exp.receiptImage)
  const mimeType = exp.receiptImage.type

  try {
    const embeddedImage = mimeType === 'image/png'
      ? await doc.embedPng(buf)
      : await doc.embedJpg(buf)

    const maxW = width - margin * 2
    const maxH = height - margin * 2
    const dims = embeddedImage.scaleToFit(maxW, maxH)

    page.drawImage(embeddedImage, {
      x: margin + (maxW - dims.width) / 2,
      y: margin + (maxH - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    })
  } catch {
    // Leave page blank rather than crashing the whole PDF
  }
}

import Tesseract from 'tesseract.js'
import type { OCRResult } from '../types/expense'

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
  /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
]


function extractDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      let y: string, mo: string, d: string
      if (m[1].length === 4) {
        [, y, mo, d] = m
      } else {
        [, d, mo, y] = m
        if (y.length === 2) y = `20${y}`
      }
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return undefined
}

function extractAmount(text: string): number | undefined {
  // Try labeled amount first
  const labeled = text.match(/(?:Total|TOTAL|Grand Total|Subtotal|Amount)[.\s:]*([0-9][0-9.,\s]{2,})/i)
  if (labeled) {
    const clean = labeled[1].replace(/[\s.]/g, '').replace(',', '')
    const n = parseInt(clean, 10)
    if (!isNaN(n) && n > 0) return n
  }

  // Fallback: collect all large numbers and take max
  const candidates: number[] = []
  const globalPattern = /([0-9]{1,3}(?:[.,]\d{3})+)/g
  let m: RegExpExecArray | null
  while ((m = globalPattern.exec(text)) !== null) {
    const clean = m[1].replace(/[.,]/g, '')
    const n = parseInt(clean, 10)
    if (!isNaN(n) && n >= 1000) candidates.push(n)
  }
  return candidates.length > 0 ? Math.max(...candidates) : undefined
}

// function extractMerchant(text: string): string | undefined {
//   const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2)
//   // Return the first non-trivial line as the merchant name
//   return lines[0] ?? undefined
// }

export async function runOCR(image: Blob): Promise<OCRResult> {
  const result = await Tesseract.recognize(image, 'eng+ind', {
    logger: () => {},
  })

  const rawText = result.data.text
  const confidence = result.data.confidence

  return {
    date: extractDate(rawText),
    amount: extractAmount(rawText),
    merchant: '',
    rawText,
    confidence,
  }
}

import { useState } from 'react'
import { runOCR } from '../services/ocr.service'
import type { OCRResult } from '../types/expense'

type OCRStatus = 'idle' | 'processing' | 'done' | 'error'

export function useOCR() {
  const [status, setStatus] = useState<OCRStatus>('idle')
  const [result, setResult] = useState<OCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function process(image: Blob) {
    setStatus('processing')
    setError(null)
    try {
      const ocr = await runOCR(image)
      setResult(ocr)
      setStatus('done')
      return ocr
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed')
      setStatus('error')
      return null
    }
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setError(null)
  }

  return { status, result, error, process, reset }
}

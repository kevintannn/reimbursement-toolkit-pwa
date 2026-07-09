import { useState } from 'react'
import { db } from '../db/db'
import { generateExcel } from '../services/excel.service'
import { generatePDF } from '../services/pdf.service'
import { isoNow } from '../utils/date'
import type { BatchInfo } from '../types/batch'

export function useGenerateBatch() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(batchId: string) {
    setGenerating(true)
    setError(null)
    try {
      const batch = await db.batches.get(batchId)
      if (!batch) throw new Error('Batch not found')

      const expenses = await db.expenses.where('batchId').equals(batchId).toArray()
      if (expenses.length === 0) throw new Error('No expenses in this batch')

      const sortedDates = expenses.map((e) => e.date).sort()
      const info: BatchInfo = {
        name: batch.name,
        dateFrom: sortedDates[0],
        dateTo: sortedDates[sortedDates.length - 1],
      }

      const [excelBlob, pdfBlob] = await Promise.all([
        generateExcel(info, expenses),
        generatePDF(info, expenses),
      ])

      await db.batches.update(batchId, {
        status: 'generated',
        excelBlob,
        pdfBlob,
        generatedAt: isoNow(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      throw err
    } finally {
      setGenerating(false)
    }
  }

  return { generate, generating, error, clearError: () => setError(null) }
}

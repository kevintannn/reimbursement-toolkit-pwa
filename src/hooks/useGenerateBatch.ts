import { useRef, useState } from 'react'
import { db } from '../db/db'
import { generateExcel } from '../services/excel.service'
import { generatePDF } from '../services/pdf.service'
import { autoBackupToCloud, type AutoBackupResult } from '../services/cloud.service'
import { isoNow } from '../utils/date'
import type { BatchInfo } from '../types/batch'

export type CloudSyncState = { status: 'idle' } | { status: 'uploading' } | AutoBackupResult

export function useGenerateBatch() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cloud, setCloud] = useState<CloudSyncState>({ status: 'idle' })
  const latestRun = useRef(0) // so a slow earlier upload can't overwrite a newer result

  async function generate(batchId: string) {
    setGenerating(true)
    setError(null)
    const run = ++latestRun.current
    setCloud({ status: 'idle' }) // don't show the previous run's backup result
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

      // Back up in the background — generation is already done and never waits on this
      setCloud({ status: 'uploading' })
      void autoBackupToCloud().then((result) => {
        if (latestRun.current === run) setCloud(result)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      throw err
    } finally {
      setGenerating(false)
    }
  }

  return { generate, generating, error, cloud, clearError: () => setError(null) }
}

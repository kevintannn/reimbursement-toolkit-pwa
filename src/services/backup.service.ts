import { db } from '../db/db'
import { blobToDataURL } from '../utils/image'
import { isoNow } from '../utils/date'
import type { Expense } from '../types/expense'
import type { Batch } from '../types/batch'
import type { Category } from '../types/category'

const BACKUP_VERSION = 1

interface SerializedExpense extends Omit<Expense, 'receiptImage'> {
  receiptImageDataURL: string
}

// Blobs are skipped — Excel/PDF outputs are always regeneratable
interface SerializedBatch extends Omit<Batch, 'excelBlob' | 'pdfBlob'> {}

interface Setting { key: string; value: string }

export interface BackupData {
  version: number
  exportedAt: string
  expenses: SerializedExpense[]
  batches: SerializedBatch[]
  categories: Category[]
  settings: Setting[]
}

export async function exportBackup(): Promise<void> {
  const [expenses, batches, categories, settings] = await Promise.all([
    db.expenses.toArray(),
    db.batches.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ])

  // Convert receipt Blobs → base64 data URLs
  const serializedExpenses: SerializedExpense[] = await Promise.all(
    expenses.map(async (exp) => {
      const { receiptImage, ...rest } = exp
      return { ...rest, receiptImageDataURL: await blobToDataURL(receiptImage) }
    })
  )

  // Strip regeneratable blobs from batches
  const serializedBatches: SerializedBatch[] = batches.map(
    ({ excelBlob: _e, pdfBlob: _p, ...rest }) => rest
  )

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: isoNow(),
    expenses: serializedExpenses,
    batches: serializedBatches,
    categories,
    settings,
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `reimburse-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File, mode: 'merge' | 'replace'): Promise<void> {
  const text = await file.text()
  const data: BackupData = JSON.parse(text)

  if (data.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${data.version}`)
  }

  // Reconstruct receipt Blobs from data URLs
  const expenses: Expense[] = await Promise.all(
    data.expenses.map(async ({ receiptImageDataURL, ...rest }) => {
      const response = await fetch(receiptImageDataURL)
      const receiptImage = await response.blob()
      return { ...rest, receiptImage }
    })
  )

  await db.transaction('rw', db.expenses, db.batches, db.categories, db.settings, async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.expenses.clear(),
        db.batches.clear(),
        db.categories.clear(),
        db.settings.clear(),
      ])
    }

    // bulkPut upserts — safe for both merge and replace
    await db.expenses.bulkPut(expenses)
    await db.batches.bulkPut(data.batches as Batch[])
    await db.categories.bulkPut(data.categories)
    await db.settings.bulkPut(data.settings)
  })
}

import { db } from '../db/db'
import { isoNow } from '../utils/date'
import type { Expense } from '../types/expense'
import type { Batch } from '../types/batch'
import type { Category } from '../types/category'

// v1 embedded every receipt as base64; v2 leaves images out (they stay on the
// device that captured them). Both are accepted on import.
const BACKUP_VERSION = 2
const SUPPORTED_VERSIONS = [1, 2]

interface SerializedExpense extends Omit<Expense, 'receiptImage'> {
  receiptImageDataURL?: string // v1 only
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

export interface PreparedBackup {
  blob: Blob
  filename: string
}

// Reads + serializes everything. Kept separate from saving so the UI can do this
// slow work first and then trigger the actual save from a fresh user tap (iOS).
export async function buildBackup(): Promise<PreparedBackup> {
  const [expenses, batches, categories, settings] = await Promise.all([
    db.expenses.toArray(),
    db.batches.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ])

  const serializedExpenses: SerializedExpense[] = expenses.map(
    ({ receiptImage: _img, ...rest }) => rest
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

  const json = JSON.stringify(backup)
  const date = new Date().toISOString().slice(0, 10)
  return {
    blob: new Blob([json], { type: 'application/json' }),
    filename: `reimburse-backup-${date}.json`,
  }
}

// iPhone/iPad. iPadOS reports itself as a Mac, so also check for touch.
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

// True when the browser refused a share because the user gesture had already
// expired (iOS Safari does this once any await runs before share()).
export function isActivationError(err: unknown): boolean {
  const name = (err as Error)?.name
  return name === 'NotAllowedError' || name === 'InvalidStateError'
}

// Turns a save failure into a message for the user.
export function describeSaveError(err: unknown): string {
  if (isActivationError(err)) {
    return 'iPhone blocked saving this file. Download it from your PC instead.'
  }
  return err instanceof Error ? err.message : 'Could not save the file'
}

// Saves a backup file to the device.
// iOS PWAs ignore <a download> — there is no downloads folder — so the Web
// Share sheet ("Save to Files") is the only route there. Everywhere else a
// plain download is used: desktop Chrome/Edge also support the share sheet but
// reject it after an await, and a normal download is what's wanted anyway.
// The anchor must be in the DOM and must outlive the click before revoking.
export async function saveBackupFile({ blob, filename }: PreparedBackup): Promise<void> {
  if (isIOS()) {
    const file = new File([blob], filename, { type: 'application/json' })
    try {
      await navigator.share({ files: [file], title: filename })
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') throw err // AbortError = user dismissed the sheet
    }
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function exportBackup(): Promise<void> {
  await saveBackupFile(await buildBackup())
}

export async function importBackup(file: File, mode: 'merge' | 'replace'): Promise<void> {
  await importBackupText(await file.text(), mode)
}

export async function importBackupText(text: string, mode: 'merge' | 'replace'): Promise<void> {
  let data: BackupData
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not a valid backup')
  }
  if (!SUPPORTED_VERSIONS.includes(data?.version) || !Array.isArray(data.expenses)) {
    throw new Error(`Unsupported backup version: ${data?.version}`)
  }

  // Decode any v1 embedded images up front — awaiting non-Dexie work inside the
  // transaction below would close it.
  const incoming = await Promise.all(
    data.expenses.map(async ({ receiptImageDataURL, ...rest }) => ({
      expense: rest,
      image: receiptImageDataURL ? await (await fetch(receiptImageDataURL)).blob() : undefined,
    }))
  )

  await db.transaction('rw', db.expenses, db.batches, db.categories, db.settings, async () => {
    // A backup without images must never wipe receipts that live on this device,
    // in either mode — so capture them before anything is cleared or overwritten.
    const existing = await db.expenses.bulkGet(incoming.map((i) => i.expense.id))
    const expenses: Expense[] = incoming.map(({ expense, image }, idx) => {
      const receiptImage = image ?? existing[idx]?.receiptImage
      return receiptImage ? { ...expense, receiptImage } : expense
    })

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

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Batch } from '../types/batch'

export function useBatches() {
  const batches = useLiveQuery(() => db.batches.orderBy('createdAt').reverse().toArray(), [])
  return { batches: batches ?? [] }
}

export function useBatch(id: string) {
  const batch = useLiveQuery(() => db.batches.get(id), [id])
  return { batch: batch ?? null }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export type { Batch }

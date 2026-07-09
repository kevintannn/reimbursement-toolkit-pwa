import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Expense, ExpenseFormData } from '../types/expense'
import { v4 as uuidv4 } from 'uuid'
import { isoNow } from '../utils/date'
import { markBatchModified } from '../services/batch.service'

export function useExpenses() {
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [])
  return { expenses: expenses ?? [] }
}

export function useBatchExpenses(batchId: string) {
  const expenses = useLiveQuery(
    () => db.expenses.where('batchId').equals(batchId).toArray(),
    [batchId]
  )
  return { expenses: expenses ?? [] }
}

export async function saveExpense(data: ExpenseFormData): Promise<string> {
  const id = uuidv4()
  const now = isoNow()
  await db.expenses.add({ ...data, id, createdAt: now, updatedAt: now })
  await markBatchModified(data.batchId)
  return id
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  const existing = await db.expenses.get(id)
  await db.expenses.update(id, { ...data, updatedAt: isoNow() })

  // Mark the batch(es) affected. If the expense moved to a different batch,
  // both the source and destination batches are affected.
  const oldBatchId = existing?.batchId
  const newBatchId = data.batchId ?? oldBatchId
  if (oldBatchId) await markBatchModified(oldBatchId)
  if (newBatchId && newBatchId !== oldBatchId) await markBatchModified(newBatchId)
}

export async function deleteExpense(id: string): Promise<void> {
  const existing = await db.expenses.get(id)
  await db.expenses.delete(id)
  if (existing?.batchId) await markBatchModified(existing.batchId)
}

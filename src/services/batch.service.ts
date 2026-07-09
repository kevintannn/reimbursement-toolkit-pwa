import { db } from '../db/db'
import { v4 as uuidv4 } from 'uuid'
import type { Expense } from '../types/expense'
import type { Batch, CategoryTotal } from '../types/batch'
import { isoNow } from '../utils/date'

export function buildCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  // Pre-sort by date so ct.expenses ends up in ascending date order
  const byDate = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
  for (const exp of byDate) {
    if (!map.has(exp.category)) {
      map.set(exp.category, { category: exp.category, total: 0, expenses: [] })
    }
    const ct = map.get(exp.category)!
    ct.total += exp.amount
    ct.expenses.push(exp.id)
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

// Sort: category subtotal descending, then date ascending within each category
export function sortExpensesForBatch(expenses: Expense[]): Expense[] {
  const totals = buildCategoryTotals(expenses)
  const categoryRank = new Map(totals.map((ct, i) => [ct.category, i]))
  return [...expenses].sort((a, b) => {
    const rankDiff = (categoryRank.get(a.category) ?? 99) - (categoryRank.get(b.category) ?? 99)
    return rankDiff !== 0 ? rankDiff : a.date.localeCompare(b.date)
  })
}

export async function createNewBatch(name: string): Promise<Batch> {
  const batch: Batch = {
    id: uuidv4(),
    name: name.trim(),
    status: 'open',
    createdAt: isoNow(),
  }
  await db.batches.add(batch)
  return batch
}

// Flip a batch from 'generated' → 'modified' so the user knows the last-generated
// Excel/PDF are now stale and need re-generating. No-op for 'open'/'modified' batches.
export async function markBatchModified(batchId: string): Promise<void> {
  const batch = await db.batches.get(batchId)
  if (batch?.status === 'generated') {
    await db.batches.update(batchId, { status: 'modified' })
  }
}

export async function renameBatch(id: string, name: string): Promise<void> {
  await db.batches.update(id, { name: name.trim() })
  await markBatchModified(id)
}

export async function deleteBatchWithExpenses(id: string): Promise<void> {
  await db.transaction('rw', db.batches, db.expenses, async () => {
    await db.expenses.where('batchId').equals(id).delete()
    await db.batches.delete(id)
  })
}

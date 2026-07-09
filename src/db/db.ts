import Dexie, { type EntityTable } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type { Expense } from '../types/expense'
import type { Batch } from '../types/batch'
import type { Category } from '../types/category'
import { DEFAULT_CATEGORIES } from '../types/category'
import { isoNow } from '../utils/date'

interface Setting {
  key: string
  value: string
}

class ReimburseDB extends Dexie {
  expenses!: EntityTable<Expense, 'id'>
  batches!: EntityTable<Batch, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('ReimburseDB')

    this.version(1).stores({
      expenses: 'id, date, batchId, category, createdAt',
      batches: 'id, batchNumber, status, createdAt',
      categories: 'id, name, sortOrder',
      settings: 'key',
    })

    this.version(2).stores({
      expenses: 'id, date, batchId, category, createdAt',
      batches: 'id, name, status, createdAt',
      categories: 'id, name, sortOrder',
      settings: 'key',
    }).upgrade(async (tx) => {
      // Migrate old batches: add name from title or batchNumber
      const allBatches = await tx.table('batches').toArray()
      for (const b of allBatches) {
        if (!b.name) {
          await tx.table('batches').update(b.id, {
            name: b.title ?? `Batch #${b.batchNumber ?? '?'}`,
          })
        }
      }

      // Assign orphaned expenses (no batchId) to a default "Unassigned" batch
      const orphans = await tx.table('expenses').filter((e: Expense) => !e.batchId).toArray()
      if (orphans.length > 0) {
        const defaultBatch: Batch = {
          id: uuidv4(),
          name: 'Unassigned',
          status: 'open',
          createdAt: isoNow(),
        }
        await tx.table('batches').add(defaultBatch)
        for (const exp of orphans) {
          await tx.table('expenses').update(exp.id, { batchId: defaultBatch.id })
        }
      }
    })

    this.version(3).stores({
      expenses: 'id, date, batchId, category, createdAt',
      batches: 'id, name, status, createdAt',
      categories: 'id, name, sortOrder',
      settings: 'key',
    }).upgrade(async (tx) => {
      await tx.table('categories').clear()
      await tx.table('categories').bulkAdd(
        DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uuidv4() }))
      )
    })
  }
}

export const db = new ReimburseDB()

db.on('populate', async () => {
  await db.categories.bulkAdd(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uuidv4() }))
  )
  await db.settings.bulkAdd([
    { key: 'currency', value: 'IDR' },
    { key: 'currencySymbol', value: 'Rp' },
  ])
})

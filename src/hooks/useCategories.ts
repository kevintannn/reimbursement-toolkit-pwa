import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Category } from '../types/category'
import { v4 as uuidv4 } from 'uuid'

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])
  return { categories: categories ?? [] }
}

export async function addCategory(name: string): Promise<void> {
  const all = await db.categories.count()
  await db.categories.add({ id: uuidv4(), name, sortOrder: all })
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id)
}

export async function reorderCategories(categories: Category[]): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    for (let i = 0; i < categories.length; i++) {
      await db.categories.update(categories[i].id, { sortOrder: i })
    }
  })
}

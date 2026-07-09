import { db } from '../db/db'
import { isoNow } from '../utils/date'
import type { Expense } from '../types/expense'
import type { Batch } from '../types/batch'

// All seeded records use these id prefixes so they can be cleanly removed later.
const BATCH_PREFIX = 'seed-batch-'
const EXP_PREFIX = 'seed-exp-'

const FALLBACK_CATS = [
  '办公室费用', '买菜费用', '车辆费用', '日常费用', '财务费用', '电费',
  '外出办公误餐费', '打车费用', '差旅费', '快递费用', '网络费', '服务费用',
  '工资', '协调费', '别墅工程费用', '别墅区管理费', '购物', '招待餐费',
  '机场费用', '物业费用', '公证费', '园区星链', '中介费',
]
const USAGES = ['付款', '采购', '报销', '充值', '维修', '服务费', '餐费', '运费', '月结', '补贴', '押金', '结算', '工程款', '管理费', '咨询']

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = <T,>(arr: T[]): T => arr[rnd(0, arr.length - 1)]

// 3 batches (one per recent month) with 100 expenses split across them.
export async function seedTestData(): Promise<{ batches: number; expenses: number }> {
  const dbCats = await db.categories.toArray()
  const cats = dbCats.length > 0 ? dbCats.map((c) => c.name) : FALLBACK_CATS

  const now = isoNow()
  const nowMonth = new Date()
  // Build the 3 most recent months as 'YYYY-MM'
  const months = [2, 1, 0].map((back) => {
    const d = new Date(nowMonth.getFullYear(), nowMonth.getMonth() - back, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}月报销`
    return { key, label }
  })

  const blob = new Blob(['receipt-placeholder'], { type: 'image/png' })

  const batches: Batch[] = months.map((m, i) => ({
    id: BATCH_PREFIX + i,
    name: m.label,
    status: 'open',
    createdAt: now,
  }))

  const counts = [34, 33, 33]
  const expenses: Expense[] = []
  let n = 0
  months.forEach((m, i) => {
    for (let j = 0; j < counts[i]; j++) {
      const day = String(rnd(1, 28)).padStart(2, '0')
      const amount = pick([
        rnd(20, 300) * 1000,
        rnd(20, 300) * 1000,
        rnd(300, 2000) * 1000,
        rnd(1000, 8000) * 1000,
      ])
      expenses.push({
        id: EXP_PREFIX + n,
        date: `${m.key}-${day}`,
        usage: `${pick(USAGES)} #${n + 1}`,
        amount,
        category: pick(cats),
        receiptImage: blob,
        batchId: batches[i].id,
        createdAt: now,
        updatedAt: now,
      })
      n++
    }
  })

  await db.transaction('rw', db.batches, db.expenses, async () => {
    await db.batches.bulkPut(batches)
    await db.expenses.bulkPut(expenses)
  })

  return { batches: batches.length, expenses: expenses.length }
}

// Removes only records created by seedTestData (id prefixes), leaving real data intact.
export async function clearSeedData(): Promise<number> {
  let removed = 0
  await db.transaction('rw', db.batches, db.expenses, async () => {
    const exps = await db.expenses.filter((e) => e.id.startsWith(EXP_PREFIX)).primaryKeys()
    const bats = await db.batches.filter((b) => b.id.startsWith(BATCH_PREFIX)).primaryKeys()
    await db.expenses.bulkDelete(exps)
    await db.batches.bulkDelete(bats)
    removed = exps.length + bats.length
  })
  return removed
}

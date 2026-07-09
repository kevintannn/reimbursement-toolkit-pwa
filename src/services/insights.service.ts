import type { Expense } from '../types/expense'
import { shiftMonth, formatDisplayDate } from '../utils/date'
import { formatRupiah } from '../utils/currency'

export interface CategoryRank {
  category: string
  total: number
  count: number
  share: number // 0..1 of the month's total
}

export interface MonthInsights {
  monthKey: string
  total: number
  count: number
  categories: CategoryRank[] // sorted desc by total
  topExpenses: Expense[]     // up to 30, sorted desc by amount
  bullets: string[]
}

const monthOf = (iso: string) => iso.slice(0, 7)

export function computeMonthInsights(all: Expense[], monthKey: string): MonthInsights {
  const inMonth = all.filter((e) => monthOf(e.date) === monthKey)
  const total = inMonth.reduce((s, e) => s + e.amount, 0)
  const count = inMonth.length

  // Category totals + counts
  const map = new Map<string, { total: number; count: number }>()
  for (const e of inMonth) {
    const c = map.get(e.category) ?? { total: 0, count: 0 }
    c.total += e.amount
    c.count += 1
    map.set(e.category, c)
  }
  const categories: CategoryRank[] = [...map.entries()]
    .map(([category, v]) => ({
      category,
      total: v.total,
      count: v.count,
      share: total > 0 ? v.total / total : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const topExpenses = [...inMonth].sort((a, b) => b.amount - a.amount).slice(0, 30)

  const prevTotal = all
    .filter((e) => monthOf(e.date) === shiftMonth(monthKey, -1))
    .reduce((s, e) => s + e.amount, 0)

  return {
    monthKey,
    total,
    count,
    categories,
    topExpenses,
    bullets: buildBullets(inMonth, total, count, categories, prevTotal),
  }
}

function buildBullets(
  inMonth: Expense[],
  total: number,
  count: number,
  categories: CategoryRank[],
  prevTotal: number
): string[] {
  if (count === 0) return ['No expenses recorded for this month.']

  const bullets: string[] = []
  const pct = (n: number) => Math.round(n * 100)

  bullets.push(`Logged ${count} expense${count !== 1 ? 's' : ''} totaling ${formatRupiah(total)}.`)

  const top = categories[0]
  bullets.push(`Biggest category was ${top.category} at ${formatRupiah(top.total)} (${pct(top.share)}% of the month).`)

  // Spending concentration — top 3 categories' combined share
  if (categories.length > 3) {
    const top3 = categories.slice(0, 3).reduce((s, c) => s + c.share, 0)
    bullets.push(`Top 3 categories make up ${pct(top3)}% of total spending across ${categories.length} categories.`)
  }

  const avg = Math.round(total / count)
  bullets.push(`Average expense was ${formatRupiah(avg)}.`)

  const largest = inMonth.reduce((a, b) => (b.amount > a.amount ? b : a))
  bullets.push(`Largest single expense: ${formatRupiah(largest.amount)} — ${largest.usage} on ${formatDisplayDate(largest.date)}.`)

  // Most frequent category by number of entries
  const byCount = [...categories].sort((a, b) => b.count - a.count)[0]
  if (byCount.count > 1) {
    bullets.push(`Most frequent category was ${byCount.category} with ${byCount.count} entries.`)
  }

  // Month-over-month comparison
  if (prevTotal > 0) {
    const delta = (total - prevTotal) / prevTotal
    const dir = delta >= 0 ? 'up' : 'down'
    bullets.push(`Spending is ${dir} ${pct(Math.abs(delta))}% versus last month (${formatRupiah(prevTotal)}).`)
  } else {
    bullets.push('No spending recorded last month to compare against.')
  }

  return bullets
}

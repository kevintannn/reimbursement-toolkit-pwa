import { useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { ExpenseCard } from '../components/expense/ExpenseCard'
import { EditExpenseModal } from '../components/expense/EditExpenseModal'
import { useExpenses } from '../hooks/useExpenses'
import { useBatches } from '../hooks/useBatches'
import { formatRupiah } from '../utils/currency'
import type { Expense } from '../types/expense'

export function ExpenseListPage() {
  const { expenses } = useExpenses()
  const { batches } = useBatches()
  const [filter, setFilter] = useState<'all' | 'generated' | 'open'>('all')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const batchMap = new Map(batches.map((b) => [b.id, b]))

  const filtered = expenses.filter((e: Expense) => {
    if (filter === 'generated') return batchMap.get(e.batchId)?.status === 'generated'
    if (filter === 'open') return batchMap.get(e.batchId)?.status === 'open'
    return true
  })

  const total = filtered.reduce((s: number, e: Expense) => s + e.amount, 0)

  return (
    <div>
      <PageHeader
        title="All Expenses"
        subtitle={`${filtered.length} expenses · ${formatRupiah(total)}`}
      />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          {(['all', 'open', 'generated'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors touch-manipulation ${
                filter === f ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">No expenses found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((exp: Expense) => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                batchName={batchMap.get(exp.batchId)?.name}
                onEdit={setEditingExpense}
              />
            ))}
          </div>
        )}
      </div>

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          batches={batches}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </div>
  )
}

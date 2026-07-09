import { useState } from 'react'
import type { Expense } from '../../types/expense'
import { formatDisplayDate } from '../../utils/date'
import { formatRupiah } from '../../utils/currency'
import { blobToDataURL } from '../../utils/image'
import { deleteExpense } from '../../hooks/useExpenses'

interface ExpenseCardProps {
  expense: Expense
  batchName?: string
  onEdit?: (expense: Expense) => void
}

export function ExpenseCard({ expense, batchName, onEdit }: ExpenseCardProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  async function toggleExpand() {
    if (!expanded && !imgUrl) {
      const url = await blobToDataURL(expense.receiptImage)
      setImgUrl(url)
    }
    setExpanded((v) => !v)
  }

  async function handleDelete() {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(expense.id)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <button
          onClick={toggleExpand}
          className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg flex-shrink-0"
        >
          🧾
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleExpand}>
          <p className="text-sm font-medium text-slate-800 truncate">{expense.usage}</p>
          <p className="text-xs text-slate-500">
            {formatDisplayDate(expense.date)} · {expense.category}
            {batchName && <span className="text-slate-400"> · {batchName}</span>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-blue-700">{formatRupiah(expense.amount)}</p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-3">
          {imgUrl && (
            <img src={imgUrl} alt="Receipt" className="w-full rounded-lg object-contain max-h-64" />
          )}
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(expense)}
                className="flex-1 py-2 rounded-lg border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex-1 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

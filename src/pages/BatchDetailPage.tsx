import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spinner } from '../components/common/Spinner'
import { ExpenseCard } from '../components/expense/ExpenseCard'
import { EditExpenseModal } from '../components/expense/EditExpenseModal'
import { useBatch, useBatches, downloadBlob } from '../hooks/useBatches'
import { useBatchExpenses } from '../hooks/useExpenses'
import { useGenerateBatch } from '../hooks/useGenerateBatch'
import { renameBatch } from '../services/batch.service'
import { buildCategoryTotals } from '../services/batch.service'
import { formatRupiah } from '../utils/currency'
import { formatDisplayDate, formatDateRange } from '../utils/date'
import type { Expense } from '../types/expense'

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { batch } = useBatch(id!)
  const { batches } = useBatches()
  const { expenses } = useBatchExpenses(id!)
  const { generate, generating, error } = useGenerateBatch()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  if (!batch) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner label="Loading…" />
      </div>
    )
  }

  const totals = buildCategoryTotals(expenses)
  const grandTotal = totals.reduce((s, ct) => s + ct.total, 0)
  const dates = expenses.map((e) => e.date).sort()
  const dateRange = dates.length > 0
    ? formatDateRange(dates[0], dates[dates.length - 1])
    : '—'

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return
    await renameBatch(batch!.id, nameInput.trim())
    setEditingName(false)
  }

  async function handleGenerate() {
    await generate(batch!.id)
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 pt-10 pb-4">
        <button
          onClick={() => navigate('/batches')}
          className="text-blue-200 text-sm mb-2 hover:text-white"
        >
          ← Batches
        </button>

        {editingName ? (
          <form onSubmit={handleRename} className="flex gap-2 mt-1">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 bg-blue-800 text-white placeholder-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button type="submit" className="px-3 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold">
              Save
            </button>
            <button type="button" onClick={() => setEditingName(false)} className="px-3 py-2 text-blue-200 text-sm">
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold leading-tight flex-1 truncate">{batch.name}</h1>
            <button
              onClick={() => { setNameInput(batch.name); setEditingName(true) }}
              className="text-blue-200 text-xs hover:text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Rename
            </button>
          </div>
        )}

        <p className="text-blue-200 text-sm mt-1">{dateRange} · {expenses.length} expenses</p>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Summary card */}
        {expenses.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Summary</span>
              <span className="text-sm font-bold text-blue-700">{formatRupiah(grandTotal)}</span>
            </div>
            {totals.map((ct) => (
              <div key={ct.category} className="flex justify-between px-4 py-2 text-sm border-b border-slate-50 last:border-0">
                <span className="text-slate-600">{ct.category}</span>
                <span className="text-slate-800 font-medium">{formatRupiah(ct.total)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/add?batchId=${batch.id}`)}
            className="flex-1 py-3 rounded-xl border-2 border-blue-700 text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors"
          >
            + Add Expense
          </button>

          {generating ? (
            <div className="flex-1 flex justify-center items-center py-3">
              <Spinner size="sm" label="Generating…" />
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={expenses.length === 0}
              className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-800 transition-colors"
            >
              ⚡ Generate
            </button>
          )}
        </div>

        {/* Stale warning — files no longer match the current expenses */}
        {batch.status === 'modified' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-sm">
            This batch changed since it was last generated. Re-generate to update the Excel & PDF.
          </div>
        )}

        {/* Download buttons — last-generated files stay available even when modified */}
        {(batch.status === 'generated' || batch.status === 'modified') && (
          <div className="flex gap-2">
            {batch.excelBlob && (
              <button
                onClick={() => downloadBlob(batch.excelBlob!, `${batch.name}.xlsx`)}
                className="flex-1 py-2.5 rounded-lg border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors"
              >
                ⬇ Excel
              </button>
            )}
            {batch.pdfBlob && (
              <button
                onClick={() => downloadBlob(batch.pdfBlob!, `${batch.name}.pdf`)}
                className="flex-1 py-2.5 rounded-lg border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                ⬇ PDF
              </button>
            )}
          </div>
        )}

        {batch.generatedAt && (
          <p className="text-xs text-slate-400 text-center">
            Last generated {formatDisplayDate(batch.generatedAt.slice(0, 10))}
            {' '}· Re-generate anytime to update
          </p>
        )}

        {/* Expense list */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Expenses ({expenses.length})
          </p>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No expenses yet — tap Add Expense to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp: Expense) => (
                <ExpenseCard key={exp.id} expense={exp} onEdit={setEditingExpense} />
              ))}
            </div>
          )}
        </div>
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

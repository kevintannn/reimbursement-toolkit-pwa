import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/common/PageHeader'
import { useBatches } from '../hooks/useBatches'
import { createNewBatch, deleteBatchWithExpenses } from '../services/batch.service'
import { useBatchExpenses } from '../hooks/useExpenses'
import { formatRupiah } from '../utils/currency'
import { formatDisplayDate } from '../utils/date'
import type { Batch } from '../types/batch'

function BatchCard({ batch, onClick }: { batch: Batch; onClick: () => void }) {
  const { expenses } = useBatchExpenses(batch.id)
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${batch.name}" and all its expenses?`)) return
    await deleteBatchWithExpenses(batch.id)
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{batch.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            {batch.generatedAt && (
              <> · Generated {formatDisplayDate(batch.generatedAt.slice(0, 10))}</>
            )}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-blue-700">{formatRupiah(total)}</p>
          <span
            className={`text-xs rounded-full px-2 py-0.5 ${
              batch.status === 'generated'
                ? 'bg-green-100 text-green-700'
                : batch.status === 'modified'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {batch.status === 'generated'
              ? 'Generated'
              : batch.status === 'modified'
              ? 'Modified'
              : 'Open'}
          </span>
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export function BatchListPage() {
  const { batches } = useBatches()
  const navigate = useNavigate()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const batch = await createNewBatch(newName.trim())
      setNewName('')
      navigate(`/batches/${batch.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <PageHeader title="Batches" subtitle="Create and manage reimbursement batches" />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Create form */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New batch name… e.g. Week 1 May"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            className="px-4 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
          >
            + Create
          </button>
        </form>

        {batches.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">📂</div>
            <p className="text-sm">No batches yet — create your first one above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((b: Batch) => (
              <BatchCard
                key={b.id}
                batch={b}
                onClick={() => navigate(`/batches/${b.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { Expense } from '../../types/expense'
import type { Batch } from '../../types/batch'
import { useCategories } from '../../hooks/useCategories'
import { updateExpense } from '../../hooks/useExpenses'
import { blobToDataURL } from '../../utils/image'
import { parseRupiahInput, formatRupiah } from '../../utils/currency'

interface Props {
  expense: Expense
  batches: Batch[]
  onClose: () => void
}

export function EditExpenseModal({ expense, batches, onClose }: Props) {
  const { categories } = useCategories()

  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [date, setDate] = useState(expense.date)
  const [usage, setUsage] = useState(expense.usage)
  const [amountRaw, setAmountRaw] = useState(expense.amount.toString())
  const [category, setCategory] = useState(expense.category)
  const [batchId, setBatchId] = useState(expense.batchId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    blobToDataURL(expense.receiptImage).then(setImgUrl)
  }, [expense.receiptImage])

  // Lock body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateExpense(expense.id, {
        date,
        usage,
        amount: parseRupiahInput(amountRaw),
        category,
        batchId,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const amount = parseRupiahInput(amountRaw)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Edit Expense</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {imgUrl && (
            <img
              src={imgUrl}
              alt="Receipt"
              className="w-full max-h-36 object-contain bg-slate-50 border-b border-slate-100"
            />
          )}

          <form onSubmit={handleSave} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usage / Description</label>
              <input
                type="text"
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (IDR)</label>
              <input
                type="number"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                required
                min={1}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {amount > 0 && <p className="text-xs text-slate-400 mt-1">{formatRupiah(amount)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-800"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

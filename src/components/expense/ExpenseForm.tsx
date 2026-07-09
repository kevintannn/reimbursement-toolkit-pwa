import { useEffect, useState } from 'react'
import type { ExpenseFormData, OCRResult } from '../../types/expense'
import type { Batch } from '../../types/batch'
import { useCategories } from '../../hooks/useCategories'
import { todayISO } from '../../utils/date'
import { parseRupiahInput, formatRupiah } from '../../utils/currency'

interface ExpenseFormProps {
  image: Blob | null
  ocrResult: OCRResult | null
  batches: Batch[]
  defaultBatchId?: string
  onSave: (data: ExpenseFormData) => Promise<void>
  saving: boolean
}

export function ExpenseForm({ image, ocrResult, batches, defaultBatchId, onSave, saving }: ExpenseFormProps) {
  const { categories } = useCategories()

  const [batchId, setBatchId] = useState(defaultBatchId ?? '')
  const [date, setDate] = useState(todayISO())
  const [usage, setUsage] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    if (defaultBatchId) setBatchId(defaultBatchId)
  }, [defaultBatchId])

  useEffect(() => {
    if (!ocrResult) return
    if (ocrResult.date) setDate(ocrResult.date)
    if (ocrResult.amount) setAmountRaw(ocrResult.amount.toString())
    if (ocrResult.merchant) setUsage(ocrResult.merchant)
  }, [ocrResult])

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0].name)
  }, [categories, category])

  // Auto-select first batch when list loads and nothing selected
  useEffect(() => {
    if (batches.length > 0 && !batchId) setBatchId(batches[0].id)
  }, [batches, batchId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!image || !batchId) return
    const amount = parseRupiahInput(amountRaw)
    await onSave({ date, usage, amount, category, receiptImage: image, batchId })
    setDate(todayISO())
    setUsage('')
    setAmountRaw('')
  }

  const amount = parseRupiahInput(amountRaw)
  const noBatches = batches.length === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {ocrResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          OCR confidence: {Math.round(ocrResult.confidence)}% — review and correct fields below
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
        {noBatches ? (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No batches yet. Go to <strong>Batches</strong> tab to create one first.
          </p>
        ) : (
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select a batch…</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
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
          placeholder="e.g. Team lunch at Warung Nasi"
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
          placeholder="e.g. 150000"
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

      <button
        type="submit"
        disabled={!image || !batchId || noBatches || saving}
        className="w-full py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-800 active:scale-95 transition-all"
      >
        {saving ? 'Saving…' : 'Save Expense'}
      </button>
    </form>
  )
}

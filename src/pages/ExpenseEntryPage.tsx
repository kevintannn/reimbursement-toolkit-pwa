import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/common/PageHeader'
import { ReceiptUploader } from '../components/expense/ReceiptUploader'
import { ExpenseForm } from '../components/expense/ExpenseForm'
import { Spinner } from '../components/common/Spinner'
import { useOCR } from '../hooks/useOCR'
import { saveExpense } from '../hooks/useExpenses'
import { useBatches } from '../hooks/useBatches'
import type { ExpenseFormData } from '../types/expense'

export function ExpenseEntryPage() {
  const [searchParams] = useSearchParams()
  const defaultBatchId = searchParams.get('batchId') ?? undefined

  const [image, setImage] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const ocr = useOCR()
  const { batches } = useBatches()

  async function handleImage(blob: Blob) {
    setSaved(false)
    setImage(blob)
    await ocr.process(blob)
  }

  async function handleSave(data: ExpenseFormData) {
    setSaving(true)
    try {
      await saveExpense(data)
      setSaved(true)
      setImage(null)
      ocr.reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Add Expense" subtitle="Upload receipt · OCR auto-fills fields" />

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium">
            Expense saved!
          </div>
        )}

        <ReceiptUploader onImage={handleImage} />

        {ocr.status === 'processing' && (
          <div className="flex justify-center py-4">
            <Spinner label="Extracting data from receipt…" />
          </div>
        )}

        {ocr.status === 'error' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-sm">
            OCR could not read the receipt — fill in fields manually.
          </div>
        )}

        {(image || ocr.status === 'done') && (
          <ExpenseForm
            image={image}
            ocrResult={ocr.result}
            batches={batches}
            defaultBatchId={defaultBatchId}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

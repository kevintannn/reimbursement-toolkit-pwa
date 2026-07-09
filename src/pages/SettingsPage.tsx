import { useRef, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { useCategories, addCategory, deleteCategory } from '../hooks/useCategories'
import { exportBackup, importBackup } from '../services/backup.service'
import type { Category } from '../types/category'

export function SettingsPage() {
  const { categories } = useCategories()
  const [newCat, setNewCat] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newCat.trim()) return
    await addCategory(newCat.trim())
    setNewCat('')
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportBackup()
    } finally {
      setExporting(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportSuccess(false)
    setImporting(true)
    try {
      await importBackup(file, importMode)
      setImportSuccess(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Categories & preferences" />

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Categories</h2>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden mb-3">
            {categories.map((cat: Category) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {cat.color && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  <span className="text-sm text-slate-800">{cat.name}</span>
                </div>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category name…"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800"
            >
              Add
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Data Backup</h2>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden mb-3">
            <div className="px-4 py-3">
              <p className="text-sm text-slate-600 mb-3">Export all expenses, batches, categories, and settings to a JSON file.</p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-2.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
              >
                {exporting ? 'Exporting…' : 'Export Backup'}
              </button>
            </div>

            <div className="px-4 py-3">
              <p className="text-sm text-slate-600 mb-3">Restore from a previously exported backup file.</p>
              <div className="flex bg-slate-100 rounded-lg p-1 gap-1 mb-3">
                {(['merge', 'replace'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setImportMode(m)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                      importMode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {m === 'merge' ? 'Merge' : 'Replace All'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mb-3">
                {importMode === 'merge'
                  ? 'Adds/updates records from the backup without deleting existing data.'
                  : 'Clears all existing data before restoring. This cannot be undone.'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className={`w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 ${
                  importMode === 'replace'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                {importing ? 'Importing…' : 'Import Backup'}
              </button>
              {importError && (
                <p className="mt-2 text-xs text-red-600">{importError}</p>
              )}
              {importSuccess && (
                <p className="mt-2 text-xs text-green-600">Backup imported successfully.</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">App Info</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-slate-600">Version</span>
              <span className="text-sm text-slate-800">1.0.0</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-slate-600">Storage</span>
              <span className="text-sm text-slate-800">IndexedDB (local)</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-slate-600">OCR Engine</span>
              <span className="text-sm text-slate-800">Tesseract.js (offline)</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

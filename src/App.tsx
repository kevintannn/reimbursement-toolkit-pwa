import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/common/Layout'
import { Spinner } from './components/common/Spinner'

// Lazy-loaded pages — Vite splits each into its own chunk.
// Tesseract.js lands in the ExpenseEntry chunk (~1.2 MB).
// ExcelJS + pdf-lib land in the BatchDetail chunk (~1 MB).
// Initial load is only the shell + Dexie + routing (~200 KB).
const ExpenseEntryPage = lazy(() => import('./pages/ExpenseEntryPage').then(m => ({ default: m.ExpenseEntryPage })))
const ExpenseListPage  = lazy(() => import('./pages/ExpenseListPage').then(m  => ({ default: m.ExpenseListPage })))
const BatchListPage    = lazy(() => import('./pages/BatchListPage').then(m    => ({ default: m.BatchListPage })))
const BatchDetailPage  = lazy(() => import('./pages/BatchDetailPage').then(m  => ({ default: m.BatchDetailPage })))
const InsightsPage     = lazy(() => import('./pages/InsightsPage').then(m     => ({ default: m.InsightsPage })))
const SettingsPage     = lazy(() => import('./pages/SettingsPage').then(m     => ({ default: m.SettingsPage })))

function PageFallback() {
  return (
    <div className="flex justify-center items-center h-40">
      <Spinner />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/add" replace />} />
            <Route path="add"              element={<ExpenseEntryPage />} />
            <Route path="batches"          element={<BatchListPage />} />
            <Route path="batches/:id"      element={<BatchDetailPage />} />
            <Route path="expenses"         element={<ExpenseListPage />} />
            <Route path="insights"         element={<InsightsPage />} />
            <Route path="settings"         element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

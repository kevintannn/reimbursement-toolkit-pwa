export type BatchStatus = 'open' | 'generated' | 'modified'

export interface Batch {
  id: string
  name: string
  status: BatchStatus
  excelBlob?: Blob
  pdfBlob?: Blob
  generatedAt?: string
  createdAt: string
}

// Passed to Excel/PDF generators — computed from expenses at generation time
export interface BatchInfo {
  name: string
  dateFrom: string
  dateTo: string
}

export interface CategoryTotal {
  category: string
  total: number
  expenses: string[]  // expense IDs in display order
}

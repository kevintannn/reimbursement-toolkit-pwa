export interface Expense {
  id: string
  date: string          // 'YYYY-MM-DD'
  usage: string
  amount: number        // IDR, integer
  category: string
  receiptImage: Blob
  batchId: string       // always belongs to a batch
  createdAt: string     // ISO 8601
  updatedAt: string
}

export type ExpenseFormData = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>

export interface OCRResult {
  date?: string
  amount?: number
  merchant?: string
  category?: string
  rawText: string
  confidence: number
}

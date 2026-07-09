export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatDateRange(from: string, to: string): string {
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`
}

export function isoNow(): string {
  return new Date().toISOString()
}

// Month helpers — keys are 'YYYY-MM'
export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

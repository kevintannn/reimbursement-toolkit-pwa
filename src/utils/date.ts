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

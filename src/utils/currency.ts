export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function parseRupiahInput(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, '')
  return parseInt(cleaned, 10) || 0
}

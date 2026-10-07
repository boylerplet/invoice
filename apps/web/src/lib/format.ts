import { formatDate, formatMoney, type CurrencyCode } from "@workspace/shared"

export const money = (minor: number, currency: CurrencyCode) =>
  formatMoney(minor, currency, { decimals: "always" })
export const shortDate = (iso: string | null) => (iso ? formatDate(iso) : "—")

export function relativeTime(iso: string, now = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return formatDate(iso.slice(0, 10))
}

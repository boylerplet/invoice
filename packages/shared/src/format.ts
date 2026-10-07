import Big from "big.js"
import { CURRENCIES, type CurrencyCode } from "./currencies"
import { type Minor, normalizeDecimal } from "./money"

export const MINUS = "−"

export interface MoneyFormatOptions {
  decimals?: "always" | "auto"
  symbol?: boolean
}

function groupDigits(int: string, grouping: "indian" | "western"): string {
  if (grouping === "western" || int.length <= 3) {
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }
  const head = int.slice(0, -3)
  const tail = int.slice(-3)
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${tail}`
}

export function formatMoney(
  minor: Minor,
  code: CurrencyCode,
  { decimals = "always", symbol = true }: MoneyFormatOptions = {}
): string {
  const def = CURRENCIES[code]
  const negative = minor < 0
  const abs = Math.abs(minor)
  const factor = 10 ** def.minorDigits
  const major = Math.floor(abs / factor)
  const frac = String(abs % factor).padStart(def.minorDigits, "0")
  const whole = groupDigits(String(major), def.grouping)
  const showFrac = decimals === "always" || Number(frac) !== 0
  const body = showFrac ? `${whole}.${frac}` : whole
  return `${negative ? MINUS : ""}${symbol ? def.symbol : ""}${body}`
}

export type ParseResult =
  { ok: true; value: Minor } | { ok: false; error: string }

export function parseMoneyInput(
  input: string,
  code: CurrencyCode
): ParseResult {
  const def = CURRENCIES[code]
  const cleaned = input
    .replace(def.symbol, "")
    .replace(/[,\s]/g, "")
    .replace(/^[₹$]/, "")
  if (cleaned === "") return { ok: false, error: "Enter an amount" }
  const pattern = new RegExp(String.raw`^\d+(\.\d{1,${def.minorDigits}})?$`)
  if (!pattern.test(cleaned))
    return { ok: false, error: "Enter a valid amount" }
  const minor = Number(new Big(cleaned).times(10 ** def.minorDigits).toFixed(0))
  if (!Number.isSafeInteger(minor))
    return { ok: false, error: "Amount is too large" }
  return { ok: true, value: minor }
}

/** Minor units → plain editable string for an input ("1500.5" style, no grouping). */
export function minorToInput(minor: Minor, code: CurrencyCode): string {
  const def = CURRENCIES[code]
  return normalizeDecimal(
    new Big(minor).div(10 ** def.minorDigits).toFixed(def.minorDigits)
  )
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** "2026-04-15" → "15 Apr 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  const month = MONTHS[Number(m) - 1]
  if (!y || !m || !d || !month) return iso
  return `${Number(d)} ${month} ${y}`
}

/** Quantity for display: trims trailing zeros. */
export function formatQty(qty: string): string {
  return normalizeDecimal(qty)
}

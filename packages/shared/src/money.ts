import Big from "big.js"

/** Integer minor units (paise / cents). */
export type Minor = number

const ROUND_HALF_UP = 1

export function isMinor(value: unknown): value is Minor {
  return typeof value === "number" && Number.isSafeInteger(value)
}

export function assertMinor(value: number): Minor {
  if (!isMinor(value)) throw new RangeError(`Not a safe integer: ${value}`)
  return value
}

/** Round any Big to whole minor units, half away from zero. */
export function toMinor(value: Big): Minor {
  return assertMinor(Number(value.round(0, ROUND_HALF_UP).toFixed(0)))
}

/** quantity (decimal string) × rate (minor) → minor. */
export function multiplyQty(qty: string, rate: Minor): Minor {
  return toMinor(new Big(qty).times(rate))
}

/** percent (decimal string) of an amount (minor) → minor. */
export function percentOf(amount: Minor, percent: string): Minor {
  return toMinor(new Big(amount).times(percent).div(100))
}

export function sumMinor(values: readonly Minor[]): Minor {
  return assertMinor(values.reduce((acc, v) => acc + v, 0))
}

const QTY_RE = /^\d{1,9}(\.\d{1,3})?$/
const PERCENT_RE = /^\d{1,3}(\.\d{1,4})?$/

export function isQtyString(value: string): boolean {
  return QTY_RE.test(value)
}

export function isPercentString(value: string): boolean {
  return PERCENT_RE.test(value) && Number(value) <= 100
}

/** "2.50" → "2.5", "12.000" → "12". */
export function normalizeDecimal(value: string): string {
  return new Big(value).toString()
}

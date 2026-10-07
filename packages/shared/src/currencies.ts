export const CURRENCY_CODES = ["INR", "USD"] as const
export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export interface CurrencyDef {
  symbol: string
  minorDigits: number
  grouping: "indian" | "western"
  locale: string
}

/** Add a currency here (and to CURRENCY_CODES) to support it everywhere. */
export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  INR: { symbol: "₹", minorDigits: 2, grouping: "indian", locale: "en-IN" },
  USD: { symbol: "$", minorDigits: 2, grouping: "western", locale: "en-US" },
}

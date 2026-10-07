import {
  blankChild,
  blankItem,
  type Adjustment,
  type Child,
  type Item,
} from "@workspace/shared"

/** Builders for the line items used by the demo invoices. Rates are in rupees; stored as paise. */

const paise = (rupees: number) => Math.round(rupees * 100)

interface ItemOptions {
  detail?: string
  qty?: string
  unit?: string
}

export function fixed(
  description: string,
  rupees: number,
  options: ItemOptions = {}
): Item {
  return {
    ...blankItem(),
    description,
    detail: options.detail ?? null,
    pricing: "explicit",
    qty: options.qty ?? null,
    unit: options.qty ? (options.unit ?? null) : null,
    rate: paise(rupees),
  }
}

export function child(
  description: string,
  fee?: { rupees: number; qty?: string; unit?: string }
): Child {
  return {
    ...blankChild(),
    description,
    qty: fee?.qty ?? null,
    unit: fee?.qty ? (fee.unit ?? null) : null,
    rate: fee ? paise(fee.rupees) : null,
  }
}

/** Parent total is the sum of its priced children. */
export function breakdown(
  description: string,
  children: Child[],
  detail?: string
): Item {
  return {
    ...blankItem(),
    description,
    detail: detail ?? null,
    pricing: "rollup",
    children,
  }
}

/** A fixed-price parent whose children only describe what is included. */
export function includes(
  description: string,
  rupees: number,
  lines: string[]
): Item {
  return {
    ...fixed(description, rupees),
    children: lines.map((line) => child(line)),
  }
}

/** A heading with description-only lines and no amount of its own. */
export function scope(description: string, lines: string[]): Item {
  return {
    ...blankItem(),
    description,
    pricing: "none",
    children: lines.map((line) => child(line)),
  }
}

export function adjustment(
  kind: Adjustment["kind"],
  label: string,
  valueType: Adjustment["valueType"],
  value: string
): Adjustment {
  return { id: crypto.randomUUID(), kind, label, valueType, value }
}

export const money = paise

const AREAS = [
  "Operator console",
  "Alarm management",
  "Recipe editor",
  "Shift handover",
  "Maintenance log",
  "Energy dashboard",
  "Line overview",
  "Batch tracking",
]
const STAGES = [
  "wireframes",
  "visual design",
  "interactive prototype",
  "usability review",
  "frontend build",
  "API integration",
]

/** 42 priced rows (some long, some flat, some with quantities): fills three A4 pages. */
export function longEngagement(): Item[] {
  return Array.from({ length: 42 }, (_, n) => {
    const area = AREAS[n % AREAS.length] ?? "Module"
    const stage = STAGES[Math.floor(n / AREAS.length) % STAGES.length] ?? "work"
    const description =
      n % 13 === 4
        ? `${area}: ${stage}, including edge cases, empty states and error handling for every role on the shop floor`
        : `${area}: ${stage}`
    const hours = 4 + ((n * 3) % 9)
    return n % 3 === 0
      ? fixed(description, 18_000 + (n % 5) * 1_500, {
          detail:
            n % 10 === 0
              ? "Delivered as annotated Figma frames with a short walkthrough video."
              : undefined,
        })
      : fixed(description, 2_000 + (n % 4) * 250, {
          qty: String(hours),
          unit: "hrs",
        })
  })
}

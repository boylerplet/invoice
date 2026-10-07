import { type Minor, multiplyQty, percentOf, sumMinor } from "./money"
import type { Child, InvoiceDoc, Item } from "./schema"

export interface CalculatedChild {
  id: string
  amount: Minor | null
}
export interface CalculatedItem {
  id: string
  amount: Minor | null
  children: CalculatedChild[]
}
export interface CalculatedAdjustment {
  id: string
  label: string
  kind: "discount" | "charge"
  /** Signed: discounts negative, charges positive. */
  amount: Minor
}
export interface CalculatedInvoice {
  items: CalculatedItem[]
  subtotal: Minor
  adjustments: CalculatedAdjustment[]
  taxable: Minor
  taxAmount: Minor
  total: Minor
  /** True when adjustments push the taxable amount below zero (invalid). */
  taxableNegative: boolean
}

function lineAmount(qty: string | null, rate: Minor | null): Minor | null {
  if (rate === null) return null
  return qty === null ? rate : multiplyQty(qty, rate)
}

function childAmount(item: Item, child: Child): Minor | null {
  if (item.pricing !== "rollup") return null
  return lineAmount(child.qty, child.rate)
}

function itemAmount(item: Item, children: CalculatedChild[]): Minor | null {
  switch (item.pricing) {
    case "explicit":
      return lineAmount(item.qty, item.rate)
    case "rollup": {
      const priced = children.flatMap((c) =>
        c.amount === null ? [] : [c.amount]
      )
      return priced.length === 0 ? null : sumMinor(priced)
    }
    case "none":
      return null
  }
}

/** Pure and deterministic. Only parent amounts enter the subtotal. */
export function calculate(doc: InvoiceDoc): CalculatedInvoice {
  const items = doc.items.map((item): CalculatedItem => {
    const children = item.children.map((c) => ({
      id: c.id,
      amount: childAmount(item, c),
    }))
    return { id: item.id, amount: itemAmount(item, children), children }
  })
  const subtotal = sumMinor(
    items.flatMap((i) => (i.amount === null ? [] : [i.amount]))
  )

  const adjustments = doc.adjustments.map((adj): CalculatedAdjustment => {
    const magnitude =
      adj.valueType === "fixed"
        ? Number(adj.value)
        : percentOf(subtotal, adj.value)
    return {
      id: adj.id,
      label: adj.label,
      kind: adj.kind,
      amount: adj.kind === "discount" ? -magnitude : magnitude,
    }
  })

  const taxable = subtotal + sumMinor(adjustments.map((a) => a.amount))
  const taxAmount =
    doc.tax.enabled && taxable > 0 ? percentOf(taxable, doc.tax.rate) : 0
  return {
    items,
    subtotal,
    adjustments,
    taxable,
    taxAmount,
    total: taxable + taxAmount,
    taxableNegative: taxable < 0,
  }
}

/** Schema issues plus cross-field rules the schema cannot express. */
export function validateCalculation(calc: CalculatedInvoice): string[] {
  return calc.taxableNegative ? ["Discounts exceed the invoice subtotal"] : []
}

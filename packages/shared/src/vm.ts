import type { CalculatedInvoice } from "./calculate"
import { CURRENCIES } from "./currencies"
import { formatDate, formatMoney, formatQty } from "./format"
import type { Minor } from "./money"
import type { InvoiceDoc, InvoiceStatus, PaperSize } from "./schema"

export interface RowVM {
  id: string
  kind: "item" | "child" | "continued"
  /** Pricing mode of the owning item. */
  pricing: "explicit" | "rollup" | "none"
  description: string
  detail: string | null
  /** Formatted quantity without unit; null => empty cell. Never "1" by default. */
  qty: string | null
  unit: string | null
  /** Formatted money without currency symbol, or null. */
  rate: string | null
  amount: string | null
  isGroupParent: boolean
}
export interface RowGroupVM {
  id: string
  rows: RowVM[]
}
export interface LabelValueVM {
  label: string
  value: string
}
export interface InvoiceVM {
  status: InvoiceStatus
  paper: PaperSize
  number: string
  issueDate: string
  dueDate: string | null
  reference: string | null
  paymentTerms: string | null
  currency: { code: string; symbol: string }
  issuer: {
    displayName: string
    legalName: string | null
    addressLines: string[]
    email: string | null
    phone: string | null
    website: string | null
    taxIds: LabelValueVM[]
    logoUrl: string | null
  }
  client: {
    name: string
    contactPerson: string | null
    addressLines: string[]
    email: string | null
    phone: string | null
    taxIds: LabelValueVM[]
  }
  groups: RowGroupVM[]
  hasQty: boolean
  hasRate: boolean
  adjustments: { label: string; amount: string; kind: "discount" | "charge" }[]
  subtotal: string
  tax: { label: string; rate: string; amount: string } | null
  /** Total includes the currency symbol; every other amount does not. */
  total: string
  notes: string | null
  payment: { title: string; lines: LabelValueVM[] } | null
}

export interface SupportFlags {
  dueDate: boolean
  reference: boolean
  paymentTerms: boolean
  notes: boolean
  paymentDetails: boolean
  tax: boolean
  adjustments: boolean
  logo: boolean
}

export interface VmOptions {
  supports: SupportFlags
  moneyDecimals: "always" | "auto"
  status: InvoiceStatus
  /** Public URL of the issuer logo, or null. */
  logoUrl: string | null
}

const nonEmpty = (value: string | null): string | null =>
  value && value.trim() !== "" ? value : null

export function buildInvoiceVM(
  doc: InvoiceDoc,
  calc: CalculatedInvoice,
  opts: VmOptions
): InvoiceVM {
  const { supports, moneyDecimals } = opts
  const code = doc.currency
  const money = (v: Minor) =>
    formatMoney(v, code, { decimals: moneyDecimals, symbol: false })
  const optMoney = (v: Minor | null) => (v === null ? null : money(v))

  const groups: RowGroupVM[] = doc.items.map((item, i) => {
    const calcItem = calc.items[i]
    const showFee = item.pricing === "explicit"
    const hasQty = showFee && item.rate !== null && item.qty !== null
    const itemRow: RowVM = {
      id: item.id,
      kind: "item",
      pricing: item.pricing,
      description: item.description,
      detail: nonEmpty(item.detail),
      qty: hasQty && item.qty !== null ? formatQty(item.qty) : null,
      unit: hasQty ? nonEmpty(item.unit) : null,
      rate: showFee ? optMoney(item.rate) : null,
      amount: optMoney(calcItem?.amount ?? null),
      isGroupParent: item.children.length > 0,
    }
    const childRows = item.children.map((child, j): RowVM => {
      const priced = item.pricing === "rollup" && child.rate !== null
      const hasChildQty = priced && child.qty !== null
      return {
        id: child.id,
        kind: "child",
        pricing: item.pricing,
        description: child.description,
        detail: null,
        qty: hasChildQty && child.qty !== null ? formatQty(child.qty) : null,
        unit: hasChildQty ? nonEmpty(child.unit) : null,
        rate: priced ? optMoney(child.rate) : null,
        amount: optMoney(calcItem?.children[j]?.amount ?? null),
        isGroupParent: false,
      }
    })
    return { id: item.id, rows: [itemRow, ...childRows] }
  })
  const allRows = groups.flatMap((g) => g.rows)

  return {
    status: opts.status,
    paper: doc.presentation.paperSize,
    number: doc.number,
    issueDate: formatDate(doc.issueDate),
    dueDate: supports.dueDate && doc.dueDate ? formatDate(doc.dueDate) : null,
    reference: supports.reference ? nonEmpty(doc.reference) : null,
    paymentTerms: supports.paymentTerms ? nonEmpty(doc.paymentTerms) : null,
    currency: { code, symbol: CURRENCIES[code].symbol },
    issuer: {
      displayName: doc.issuer.displayName,
      legalName: nonEmpty(doc.issuer.legalName),
      addressLines: doc.issuer.addressLines.filter((l) => l.trim() !== ""),
      email: nonEmpty(doc.issuer.email),
      phone: nonEmpty(doc.issuer.phone),
      website: nonEmpty(doc.issuer.website),
      taxIds: doc.issuer.taxIds.filter((t) => t.value.trim() !== ""),
      logoUrl: supports.logo ? opts.logoUrl : null,
    },
    client: {
      name: doc.client.name,
      contactPerson: nonEmpty(doc.client.contactPerson),
      addressLines: doc.client.addressLines.filter((l) => l.trim() !== ""),
      email: nonEmpty(doc.client.email),
      phone: nonEmpty(doc.client.phone),
      taxIds: doc.client.taxIds.filter((t) => t.value.trim() !== ""),
    },
    groups,
    hasQty: allRows.some((r) => r.qty !== null),
    hasRate: allRows.some((r) => r.rate !== null),
    adjustments: supports.adjustments
      ? calc.adjustments.map((a) => ({
          label: a.label,
          amount: money(a.amount),
          kind: a.kind,
        }))
      : [],
    subtotal: money(calc.subtotal),
    tax:
      supports.tax && doc.tax.enabled
        ? {
            label: doc.tax.label,
            rate: `${doc.tax.rate}%`,
            amount: money(calc.taxAmount),
          }
        : null,
    total: formatMoney(calc.total, code, { decimals: moneyDecimals }),
    notes: supports.notes ? nonEmpty(doc.notes) : null,
    payment:
      supports.paymentDetails && doc.payment && doc.payment.lines.length > 0
        ? { title: doc.payment.title, lines: doc.payment.lines }
        : null,
  }
}

import { z } from "zod"
import { CURRENCY_CODES } from "./currencies"
import { isValidIsoDate } from "./dates"
import { isMinor, isPercentString, isQtyString } from "./money"

export const MAX_ITEMS = 200
export const MAX_CHILDREN = 20

const minor = z.number().refine(isMinor, "Must be a whole number of minor units").refine((n) => n >= 0, "Cannot be negative")
const qty = z.string().refine(isQtyString, "Up to 3 decimals")
const percent = z.string().refine(isPercentString, "Enter a percentage from 0 to 100")
const isoDate = z.string().refine(isValidIsoDate, "Use YYYY-MM-DD")
const text = (max: number) => z.string().max(max)
const optText = (max: number) => z.string().max(max).nullable()

export const statusSchema = z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"])
export const pricingSchema = z.enum(["explicit", "rollup", "none"])
export const paperSizeSchema = z.enum(["A4", "LETTER"])
export const currencySchema = z.enum(CURRENCY_CODES)

export const labelValueSchema = z.object({ label: text(60), value: text(200) })

export const issuerSnapshotSchema = z.object({
  profileId: z.string(),
  displayName: text(120).min(1, "Required"),
  legalName: optText(160),
  addressLines: z.array(text(120)).max(6),
  email: optText(120),
  phone: optText(40),
  website: optText(120),
  taxIds: z.array(labelValueSchema).max(6),
  logoFile: optText(200),
})

export const clientSnapshotSchema = z.object({
  clientId: z.string(),
  name: text(120).min(1, "Required"),
  contactPerson: optText(120),
  addressLines: z.array(text(120)).max(6),
  email: optText(120),
  phone: optText(40),
  taxIds: z.array(labelValueSchema).max(6),
})

export const paymentSnapshotSchema = z.object({
  accountId: z.string(),
  title: text(60),
  lines: z.array(labelValueSchema).max(12),
})

export const childSchema = z.object({
  id: z.string(),
  description: text(200),
  qty: qty.nullable(),
  unit: optText(20),
  rate: minor.nullable(),
})

export const itemShape = z.object({
  id: z.string(),
  description: text(200),
  detail: optText(300),
  pricing: pricingSchema,
  qty: qty.nullable(),
  unit: optText(20),
  rate: minor.nullable(),
  children: z.array(childSchema).max(MAX_CHILDREN),
})

/** Rules that must hold before an invoice can be issued or saved as ISSUED. */
export const itemSchema = itemShape.superRefine((item, ctx) => {
  if (item.description.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["description"], message: "Describe this item" })
  }
  if (item.pricing === "explicit" && item.rate === null) {
    ctx.addIssue({ code: "custom", path: ["rate"], message: "Rate is required for a fixed amount" })
  }
  if (item.pricing === "rollup") {
    item.children.forEach((child, i) => {
      if (child.qty !== null && child.rate === null) {
        ctx.addIssue({ code: "custom", path: ["children", i, "rate"], message: "A quantity needs a rate" })
      }
    })
  }
})

export const adjustmentSchema = z
  .object({
    id: z.string(),
    label: text(80),
    kind: z.enum(["discount", "charge"]),
    valueType: z.enum(["fixed", "percent"]),
    value: z.string(),
  })
  .superRefine((adj, ctx) => {
    const ok = adj.valueType === "fixed" ? /^[0-9]{1,15}$/.test(adj.value) : isPercentString(adj.value)
    if (!ok) ctx.addIssue({ code: "custom", path: ["value"], message: "Invalid value" })
  })

function docShape<T extends z.ZodType>(items: T) {
  return z.object({
    schemaVersion: z.literal(1),
    type: z.literal("INVOICE"),
    number: z.string().min(1).max(32).regex(/^[A-Za-z0-9/_-]+$/, "Letters, digits, / _ - only"),
    issueDate: isoDate,
    dueDate: isoDate.nullable(),
    currency: currencySchema,
    reference: optText(80),
    paymentTerms: optText(200),
    issuer: issuerSnapshotSchema,
    client: clientSnapshotSchema,
    payment: paymentSnapshotSchema.nullable(),
    items: z.array(items).min(1, "Add at least one item").max(MAX_ITEMS),
    adjustments: z.array(adjustmentSchema).max(10),
    tax: z.object({ enabled: z.boolean(), label: text(40), rate: percent }),
    notes: optText(800),
    presentation: z.object({
      templateId: z.string().min(1),
      templateVersion: z.number().int().min(1),
      paperSize: paperSizeSchema,
    }),
  })
}

/** Strict: required to issue or save an ISSUED invoice. */
export const invoiceDocSchema = docShape(itemSchema)
/** Safe to calculate and store, but may still be incomplete (DRAFT autosave). */
export const invoiceDraftSchema = docShape(itemShape)

export type InvoiceStatus = z.infer<typeof statusSchema>
export type Pricing = z.infer<typeof pricingSchema>
export type PaperSize = z.infer<typeof paperSizeSchema>
export type LabelValue = z.infer<typeof labelValueSchema>
export type IssuerSnapshot = z.infer<typeof issuerSnapshotSchema>
export type ClientSnapshot = z.infer<typeof clientSnapshotSchema>
export type PaymentSnapshot = z.infer<typeof paymentSnapshotSchema>
export type Child = z.infer<typeof childSchema>
export type Item = z.infer<typeof itemSchema>
export type Adjustment = z.infer<typeof adjustmentSchema>
export type InvoiceDoc = z.infer<typeof invoiceDraftSchema>

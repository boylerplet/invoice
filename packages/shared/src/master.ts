import { z } from "zod"
import { CURRENCY_CODES } from "./currencies"
import { isValidIsoDate } from "./dates"
import { invoiceDraftSchema, labelValueSchema } from "./schema"

const str = (max: number) => z.string().trim().max(max)
const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v === "" ? null : v))

export const issuerProfileInputSchema = z.object({
  displayName: str(120).min(1, "Required"),
  legalName: optStr(160),
  addressLines: z.array(str(120)).max(6),
  email: optStr(120),
  phone: optStr(40),
  website: optStr(120),
  taxIds: z.array(labelValueSchema).max(6),
  defaultPaymentAccountId: z.string().nullable(),
  isDefault: z.boolean(),
})
export type IssuerProfileInput = z.infer<typeof issuerProfileInputSchema>

export const paymentAccountInputSchema = z.object({
  issuerProfileId: z.string().nullable(),
  label: str(120).min(1, "Required"),
  currency: z.enum(CURRENCY_CODES),
  kind: z.enum(["bank", "upi", "other"]),
  lines: z.array(labelValueSchema).max(12),
})
export type PaymentAccountInput = z.infer<typeof paymentAccountInputSchema>

export const clientInputSchema = z.object({
  name: str(120).min(1, "Required"),
  contactPerson: optStr(120),
  addressLines: z.array(str(120)).max(6),
  email: optStr(120),
  phone: optStr(40),
  taxIds: z.array(labelValueSchema).max(6),
  defaultIssuerProfileId: z.string().nullable(),
  defaultPaymentAccountId: z.string().nullable(),
  defaultCurrency: z.enum(CURRENCY_CODES).nullable(),
  defaultDueDays: z.number().int().min(0).max(365).nullable(),
  notes: optStr(1000),
})
export type ClientInput = z.infer<typeof clientInputSchema>

export const createInvoiceInputSchema = z.object({
  clientId: z.string(),
  issuerProfileId: z.string().optional(),
})
export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>

export const saveInvoiceInputSchema = z.object({
  doc: invoiceDraftSchema,
  changeNote: z.string().trim().max(200).nullable().optional(),
})
export type SaveInvoiceInput = z.infer<typeof saveInvoiceInputSchema>

export const payInputSchema = z.object({
  paidDate: z.string().refine(isValidIsoDate, "Use YYYY-MM-DD"),
  note: z.string().trim().max(200).nullable().optional(),
})
export type PayInput = z.infer<typeof payInputSchema>

export const cancelInputSchema = z.object({
  reason: z.string().trim().max(200).nullable().optional(),
})
export type CancelInput = z.infer<typeof cancelInputSchema>

export const loginInputSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
})
export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "At least 8 characters").max(200),
})

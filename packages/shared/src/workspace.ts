import { z } from "zod"
import { CURRENCY_CODES } from "./currencies"
import { DEFAULT_NUMBERING } from "./numbering"
import { paperSizeSchema } from "./schema"

export const numberingSettingsSchema = z.object({
  prefix: z.string().max(12),
  separator: z.enum(["-", "/", "_", ""]),
  period: z.enum(["calendar", "financial", "none"]),
  fyStartMonth: z.number().int().min(1).max(12),
  padding: z.number().int().min(1).max(10),
  startNumber: z.number().int().min(1).max(999_999_999),
  resetEachPeriod: z.boolean(),
})

export const workspaceSettingsSchema = z.object({
  defaultCurrency: z.enum(CURRENCY_CODES),
  defaultPaperSize: paperSizeSchema,
  defaultTemplateId: z.string().min(1),
  defaultDueDays: z.number().int().min(0).max(365),
  numbering: numberingSettingsSchema,
  defaultPaymentTerms: z.string().max(200).nullable(),
  defaultNotes: z.string().max(800).nullable(),
})

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  defaultCurrency: "INR",
  defaultPaperSize: "A4",
  defaultTemplateId: "studio",
  defaultDueDays: 15,
  numbering: DEFAULT_NUMBERING,
  defaultPaymentTerms: "Due within 15 days",
  defaultNotes: null,
}

export const workspaceUpdateSchema = z.object({
  name: z.string().min(1).max(120),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: tz })
      return true
    } catch {
      return false
    }
  }, "Unknown timezone"),
  settings: workspaceSettingsSchema,
})
export type WorkspaceUpdate = z.infer<typeof workspaceUpdateSchema>

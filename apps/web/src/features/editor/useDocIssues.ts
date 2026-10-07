import {
  calculate,
  invoiceDocSchema,
  validateCalculation,
  type InvoiceDoc,
} from "@workspace/shared"
import { useMemo } from "react"

export interface DocIssues {
  /** First message per field path, e.g. "items.0.rate". */
  byPath: Record<string, string>
  /** Messages that do not belong to one field. */
  general: string[]
  valid: boolean
}

/** Strict validation (what issuing requires), recomputed as the draft changes. */
export function useDocIssues(doc: InvoiceDoc | null): DocIssues {
  return useMemo(() => {
    if (!doc) return { byPath: {}, general: [], valid: true }
    const byPath: Record<string, string> = {}
    const parsed = invoiceDocSchema.safeParse(doc)
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        byPath[issue.path.join(".")] ??= issue.message
    }
    const general = validateCalculation(calculate(doc))
    return { byPath, general, valid: parsed.success && general.length === 0 }
  }, [doc])
}

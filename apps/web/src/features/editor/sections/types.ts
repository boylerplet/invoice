import type { InvoiceDoc, SupportFlags } from "@workspace/shared"

export interface SectionProps {
  doc: InvoiceDoc
  update: (change: (doc: InvoiceDoc) => InvoiceDoc) => void
  /** Validation message for a field path such as "items.0.rate", or undefined. */
  error: (path: string) => string | undefined
  supports: SupportFlags
  disabled: boolean
}

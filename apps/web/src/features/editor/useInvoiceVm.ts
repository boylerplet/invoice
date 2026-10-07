import type { InvoiceDoc, InvoiceStatus } from "@workspace/shared"
import {
  createVm,
  getTemplate,
  requireTemplate,
  type TemplateModule,
} from "@workspace/templates"
import { useMemo } from "react"

/** Resolves the invoice's template (falling back to the latest "studio") and builds the preview model. */
export function useInvoiceVm(doc: InvoiceDoc | null, status: InvoiceStatus) {
  return useMemo(() => {
    if (!doc) return null
    const { templateId, templateVersion } = doc.presentation
    const template: TemplateModule =
      getTemplate(templateId, templateVersion) ?? requireTemplate("studio")
    return { template, vm: createVm(doc, template.manifest, { status }) }
  }, [doc, status])
}

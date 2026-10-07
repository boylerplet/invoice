import { buildInvoiceVM, calculate, type InvoiceDoc, type InvoiceStatus, type InvoiceVM } from "@workspace/shared"
import type { TemplateManifest } from "./contract"

export interface CreateVmOptions {
  status?: InvoiceStatus
  /** Public URL of the issuer logo; defaults to `/uploads/<logoFile>`. */
  logoUrl?: string | null
}

/** Invoice document -> calculated -> view model, shaped for one template. */
export function createVm(doc: InvoiceDoc, manifest: TemplateManifest, opts: CreateVmOptions = {}): InvoiceVM {
  const logoUrl =
    opts.logoUrl !== undefined ? opts.logoUrl : doc.issuer.logoFile ? `/uploads/${doc.issuer.logoFile}` : null
  return buildInvoiceVM(doc, calculate(doc), {
    supports: manifest.supports,
    moneyDecimals: manifest.options.moneyDecimals,
    status: opts.status ?? "DRAFT",
    logoUrl,
  })
}

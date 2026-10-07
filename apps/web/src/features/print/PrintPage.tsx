import type { InvoiceDoc, InvoiceStatus } from "@workspace/shared"
import { InvoiceDocument, PAPER_MM } from "@workspace/templates"
import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { useInvoiceVm } from "@/features/editor/useInvoiceVm"
import { api } from "@/lib/api"

interface PrintData {
  doc: InvoiceDoc
  status: InvoiceStatus
}

/**
 * The page the PDF is printed from: only <InvoiceDocument>, white, zero margins.
 * The editor preview renders the very same component, so both show identical pages.
 */
export function PrintPage() {
  const { id = "" } = useParams()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const [data, setData] = useState<PrintData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.remove("dark")
    api
      .get<PrintData>(`/print/${id}?token=${encodeURIComponent(token)}`)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Could not load the invoice")
      )
  }, [id, token])

  const built = useInvoiceVm(data?.doc ?? null, data?.status ?? "DRAFT")
  if (error) return <p style={{ padding: 24 }}>{error}</p>
  if (!data || !built) return null
  const { w, h } = PAPER_MM[data.doc.presentation.paperSize]
  return (
    <>
      <style>{`@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;padding:0;background:#fff!important;color-scheme:light}`}</style>
      <InvoiceDocument
        vm={built.vm}
        template={built.template}
        paperSize={data.doc.presentation.paperSize}
      />
    </>
  )
}

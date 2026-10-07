import { useEffect, useMemo, useState } from "react"
import type { InvoiceVM, PagePlan, PaperSize, TemplateModule } from "../contract"
import { measureInvoice } from "./measure"
import { planPages } from "./plan"

export interface LayoutSnapshot {
  vm: InvoiceVM
  template: TemplateModule
  paper: PaperSize
  plan: PagePlan[]
}

export interface InvoiceLayout {
  /** The last successfully computed layout. It stays on screen while a new one is measured. */
  snapshot: LayoutSnapshot | null
  status: "measuring" | "ready" | "error"
  error: string | null
}

interface LayoutError {
  vm: InvoiceVM
  template: TemplateModule
  paper: PaperSize
  message: string
}

const DEBOUNCE_MS = 60

export function useInvoiceLayout(vm: InvoiceVM, template: TemplateModule, paper: PaperSize): InvoiceLayout {
  const [snapshot, setSnapshot] = useState<LayoutSnapshot | null>(null)
  const [failure, setFailure] = useState<LayoutError | null>(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      measureInvoice(vm, template, paper)
        .then((measurements) => {
          if (cancelled) return
          setSnapshot({ vm, template, paper, plan: planPages(vm, template, paper, measurements) })
          setFailure(null)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          const message = error instanceof Error ? error.message : "Layout failed"
          setFailure({ vm, template, paper, message })
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [vm, template, paper])


  return useMemo((): InvoiceLayout => {
    const same = (s: { vm: InvoiceVM; template: TemplateModule; paper: PaperSize } | null) =>
      s !== null && s.vm === vm && s.template === template && s.paper === paper
    if (failure && same(failure)) return { snapshot, status: "error", error: failure.message }
    return { snapshot, status: same(snapshot) ? "ready" : "measuring", error: null }
  }, [snapshot, failure, vm, template, paper])
}

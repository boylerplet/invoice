import { Add01Icon, MinusSignIcon } from "@hugeicons/core-free-icons"
import { InvoiceDocument, mmToPx, PAPER_MM, type InvoiceLayout, type InvoiceVM, type PaperSize, type TemplateModule } from "@workspace/templates"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Icon } from "@/components/Icon"
import { SelectField } from "@/components/form/SelectField"
import { MAX_ZOOM, MIN_ZOOM, stepZoom, usePreviewStore, ZOOM_STEPS } from "./previewStore"

const GAP = 16
const PAD = 24

interface PreviewPanelProps {
  vm: InvoiceVM
  template: TemplateModule
  paper: PaperSize
}

/** Scrollable stack of real pages with zoom. Layout runs once at 100%; zoom is only a CSS transform. */
export function PreviewPanel({ vm, template, paper }: PreviewPanelProps) {
  const { zoom, fit, page, setZoom, zoomBy, setFit, setPage } = usePreviewStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<InvoiceLayout | null>(null)
  const [content, setContent] = useState({ w: 0, h: 0 })
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const pageCount = layout?.snapshot?.plan.length ?? 0
  const pageW = mmToPx(PAPER_MM[paper].w)
  const pageH = mmToPx(PAPER_MM[paper].h)
  const onLayout = useCallback((next: InvoiceLayout) => setLayout(next), [])

  // Track the unscaled content size and the viewport size.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    const inner = contentRef.current
    if (!scroller || !inner) return
    const measure = () => {
      setContent({ w: inner.offsetWidth, h: inner.offsetHeight })
      setViewport({ w: scroller.clientWidth, h: scroller.clientHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  // Fit modes follow the viewport.
  useEffect(() => {
    if (viewport.w === 0) return
    if (fit === "width") setFit("width", (viewport.w - PAD * 2) / pageW)
    if (fit === "page") setFit("page", Math.min((viewport.h - PAD * 2) / pageH, (viewport.w - PAD * 2) / pageW))
  }, [fit, viewport, pageW, pageH, setFit])

  // Ctrl/Cmd + wheel (and trackpad pinch) zooms; plain wheel scrolls.
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      zoomBy(Math.exp(-event.deltaY * 0.0015))
    }
    scroller.addEventListener("wheel", onWheel, { passive: false })
    return () => scroller.removeEventListener("wheel", onWheel)
  }, [zoomBy])

  // The page indicator follows the scroll position.
  const updatePage = useCallback(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const box = scroller.getBoundingClientRect()
    let best = 1
    let bestVisible = -1
    scroller.querySelectorAll<HTMLElement>(".tpl-page").forEach((el, i) => {
      const r = el.getBoundingClientRect()
      const visible = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top)
      if (visible > bestVisible) {
        bestVisible = visible
        best = i + 1
      }
    })
    setPage(best)
  }, [setPage])

  useEffect(() => {
    updatePage()
  }, [updatePage, pageCount, zoom, content.h])

  function jumpTo(target: number) {
    const scroller = scrollRef.current
    if (!scroller) return
    const top = PAD + (target - 1) * (pageH + GAP) * zoom
    scroller.scrollTo({ top: top - PAD, behavior: "smooth" })
  }

  const zoomOptions = [...new Set([...ZOOM_STEPS, zoom])].sort((a, b) => a - b).map((z) => ({ value: String(z), label: `${Math.round(z * 100)}%` }))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="bg-background flex flex-wrap items-center gap-1.5 border-b px-3 py-1.5">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom(stepZoom(zoom, -1))}>
          <Icon icon={MinusSignIcon} />
        </Button>
        <SelectField id="zoom-select" className="h-8 w-24" value={String(zoom)} options={zoomOptions} onChange={(v) => setZoom(Number(v))} />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(stepZoom(zoom, 1))}>
          <Icon icon={Add01Icon} />
        </Button>
        <Button type="button" variant={fit === "width" ? "secondary" : "ghost"} size="sm" onClick={() => setFit("width", zoom)}>
          Fit width
        </Button>
        <Button type="button" variant={fit === "page" ? "secondary" : "ghost"} size="sm" onClick={() => setFit("page", zoom)}>
          Fit page
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setZoom(1)}>
          100%
        </Button>
        <div className="flex-1" />
        {layout?.status === "measuring" && <span className="text-muted-foreground text-xs">Updating…</span>}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={pageCount === 0} />}>
            Page {Math.min(page, Math.max(pageCount, 1))} of {pageCount || 1}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {Array.from({ length: pageCount }, (_, i) => (
                <DropdownMenuItem key={i} onClick={() => jumpTo(i + 1)}>
                  Page {i + 1}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {layout?.status === "error" && (
        <div role="alert" className="bg-destructive/10 text-destructive border-b px-3 py-2 text-sm">
          The preview could not be laid out: {layout.error}
        </div>
      )}
      <div ref={scrollRef} onScroll={updatePage} className="min-h-0 flex-1 overflow-auto bg-neutral-200 dark:bg-neutral-800" data-testid="preview-scroll">
        <div className="mx-auto" style={{ width: content.w * zoom + PAD * 2, height: content.h * zoom + PAD * 2, padding: PAD, boxSizing: "border-box" }}>
          <div
            ref={contentRef}
            className="[&_.tpl-page]:shadow-[0_1px_3px_rgb(0_0_0/0.2),0_8px_24px_rgb(0_0_0/0.1)]"
            style={{ transform: `scale(${zoom})`, transformOrigin: "0 0", width: "max-content" }}
            data-testid="preview-pages"
          >
            <InvoiceDocument vm={vm} template={template} paperSize={paper} gap={GAP} onLayout={onLayout} />
          </div>
        </div>
      </div>
    </div>
  )
}

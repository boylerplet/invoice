import { useEffect, useRef, type FC } from "react"
import { PAPER_MM, type InvoiceVM, type PagePlan, type PaperSize, type TemplateModule } from "./contract"
import { visibleColumns } from "./layout/columns"
import { RowBlock, TemplateRoot } from "./layout/TemplateRoot"
import { buildUnits, continuedRow, lastRowIds } from "./layout/units"
import { useInvoiceLayout, type InvoiceLayout, type LayoutSnapshot } from "./layout/useInvoiceLayout"

declare global {
  interface Window {
    /** Set to true once fonts are loaded and the page plan is committed to the DOM. */
    __INVOICE_READY__?: boolean
  }
}

export interface InvoiceDocumentProps {
  /** Memoize this: a new object triggers a new measurement. */
  vm: InvoiceVM
  template: TemplateModule
  paperSize: PaperSize
  /** Space between pages in px (preview). The PDF uses 0. */
  gap?: number
  /** Reports every layout state change (preview shows "Updating…" and errors). Keep it referentially stable. */
  onLayout?: (layout: InvoiceLayout) => void
}

const block = { display: "flow-root", flex: "none" } as const

const PageView: FC<{ snapshot: LayoutSnapshot; page: PagePlan; pageCount: number }> = ({ snapshot, page, pageCount }) => {
  const { vm, template, paper } = snapshot
  const { manifest } = template
  const { w, h } = PAPER_MM[paper]
  const m = manifest.paper[paper].margins
  const columns = visibleColumns(manifest, vm)
  const units = buildUnits(vm)
  const byId = new Map(units.map((u) => [u.id, u]))
  const lastIds = lastRowIds(vm)
  const placed = page.unitIds.flatMap((id) => byId.get(id)?.rows ?? [])
  const parent = page.continuedGroupId ? vm.groups.find((g) => g.id === page.continuedGroupId)?.rows[0] : undefined
  const isLastPage = page.pageNumber === pageCount
  const spacer = <div style={{ flex: "1 1 0", minHeight: 0 }} />
  const terminal = page.hasTerminal ? (
    <div data-block="terminal" style={block}>
      <template.Terminal vm={vm} />
    </div>
  ) : null
  const hasRows = placed.length > 0 || parent !== undefined

  return (
    <TemplateRoot
      template={template}
      columns={columns}
      className="tpl-page"
      data-page={page.pageNumber}
      style={{
        width: `${w}mm`,
        height: `${h}mm`,
        padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        flex: "none",
        breakAfter: isLastPage ? "auto" : "page",
      }}
    >
      {template.PageDecoration && (
        <template.PageDecoration vm={vm} pageNumber={page.pageNumber} pageCount={pageCount} variant={page.variant} />
      )}
      <div data-page-body style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
        <div data-block="header" style={block}>
          <template.PageHeader vm={vm} variant={page.variant} />
        </div>
        {page.variant === "first" && (
          <div data-block="intro" style={block}>
            <template.Intro vm={vm} />
          </div>
        )}
        {hasRows && (
          <div data-block="table" style={block}>
            <template.TableHead vm={vm} columns={columns} />
            {parent && (
              <RowBlock
                template={template}
                vm={vm}
                row={continuedRow(parent)}
                columns={columns}
                isFirstOnPage
                isLastOnPage={false}
                isLastInGroup={false}
              />
            )}
            {placed.map((row, i) => (
              <RowBlock
                key={row.id}
                template={template}
                vm={vm}
                row={row}
                columns={columns}
                isFirstOnPage={i === 0 && !parent}
                isLastOnPage={i === placed.length - 1}
                isLastInGroup={lastIds.has(row.id)}
              />
            ))}
          </div>
        )}
        {manifest.options.terminalAnchor === "flow" ? (
          <>
            {terminal}
            {spacer}
          </>
        ) : (
          <>
            {spacer}
            {terminal}
          </>
        )}
        <div data-block="footer" style={block}>
          <template.PageFooter vm={vm} pageNumber={page.pageNumber} pageCount={pageCount} />
        </div>
      </div>
    </TemplateRoot>
  )
}

/** The one renderer: the editor preview and the PDF both render this component. */
export const InvoiceDocument: FC<InvoiceDocumentProps> = ({ vm, template, paperSize, gap = 0, onLayout }) => {
  const layout = useInvoiceLayout(vm, template, paperSize)
  const { snapshot, status } = layout
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onLayout?.(layout)
  }, [layout, onLayout])

  const ready = status === "ready" && snapshot !== null
  useEffect(() => {
    window.__INVOICE_READY__ = false
    const root = rootRef.current
    if (!ready || !root) return
    const bodies = Array.from(root.querySelectorAll<HTMLElement>("[data-page-body]"))
    const overflowing = bodies.filter((el) => el.scrollHeight > el.clientHeight + 1)
    root.dataset.overflow = String(overflowing.length)
    if (overflowing.length > 0 && import.meta.env.DEV) {
      console.error(`Template ${template.manifest.id}: ${overflowing.length} page(s) overflow their content box`)
    }
    window.__INVOICE_READY__ = true
    return () => {
      window.__INVOICE_READY__ = false
    }
  }, [ready, snapshot, template.manifest.id])

  const plan = snapshot?.plan ?? []
  return (
    <div
      ref={rootRef}
      className="tpl-doc"
      data-layout-status={status}
      data-page-count={plan.length}
      style={{ display: "flex", flexDirection: "column", gap, width: "max-content" }}
    >
      {snapshot && plan.map((page) => <PageView key={page.pageNumber} snapshot={snapshot} page={page} pageCount={plan.length} />)}
    </div>
  )
}

import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import {
  PAPER_MM,
  type InvoiceVM,
  type PaperSize,
  type TemplateModule,
} from "../contract"
import { loadTemplateFonts } from "../fonts"
import { visibleColumns } from "./columns"
import { RowBlock, TemplateRoot } from "./TemplateRoot"
import { continuedRow, lastRowIds } from "./units"

export interface Measurements {
  headerFirst: number
  headerContinuation: number
  intro: number
  tableHead: number
  footer: number
  terminal: number
  /** Height of every row by row id. */
  rows: Record<string, number>
  /** Height of the repeated parent line by group id. */
  continued: Record<string, number>
}

/** Heights are rounded up to a quarter pixel so measured space is never underestimated. */
export const ceilQuarter = (px: number): number => Math.ceil(px * 4) / 4

export function contentSizeMm(template: TemplateModule, paper: PaperSize) {
  const { w, h } = PAPER_MM[paper]
  const m = template.manifest.paper[paper].margins
  return { width: w - m.left - m.right, height: h - m.top - m.bottom }
}

function MeasureTree({
  vm,
  template,
  paper,
}: {
  vm: InvoiceVM
  template: TemplateModule
  paper: PaperSize
}) {
  const columns = visibleColumns(template.manifest, vm)
  const wrap = (id: string, node: React.ReactNode) => (
    <div key={id} data-m={id} style={{ display: "flow-root" }}>
      {node}
    </div>
  )
  const lastIds = lastRowIds(vm)
  const { width } = contentSizeMm(template, paper)
  const firstRows = new Set(vm.groups.map((g) => g.rows[0]?.id))
  return (
    <TemplateRoot
      template={template}
      columns={columns}
      style={{ width: `${width}mm` }}
    >
      {wrap("header-first", <template.PageHeader vm={vm} variant="first" />)}
      {wrap(
        "header-continuation",
        <template.PageHeader vm={vm} variant="continuation" />
      )}
      {wrap("intro", <template.Intro vm={vm} />)}
      {wrap("table-head", <template.TableHead vm={vm} columns={columns} />)}
      {wrap("terminal", <template.Terminal vm={vm} />)}
      {wrap(
        "footer",
        <template.PageFooter vm={vm} pageNumber={1} pageCount={1} />
      )}
      {vm.groups.flatMap((group) =>
        group.rows.map((row) => (
          <div
            key={row.id}
            data-m={`row:${row.id}`}
            style={{ display: "flow-root" }}
          >
            <RowBlock
              template={template}
              vm={vm}
              row={row}
              columns={columns}
              isFirstOnPage={false}
              isLastOnPage={false}
              isLastInGroup={lastIds.has(row.id)}
            />
          </div>
        ))
      )}
      {template.manifest.options.groupContinuationLabel &&
        vm.groups.flatMap((group) => {
          const parent = group.rows[0]
          if (!parent || group.rows.length < 2 || !firstRows.has(parent.id))
            return []
          return (
            <div
              key={`c-${group.id}`}
              data-m={`continued:${group.id}`}
              style={{ display: "flow-root" }}
            >
              <RowBlock
                template={template}
                vm={vm}
                row={continuedRow(parent)}
                columns={columns}
                isFirstOnPage
                isLastOnPage={false}
                isLastInGroup={false}
              />
            </div>
          )
        })}
    </TemplateRoot>
  )
}

/**
 * Renders every block once, off-screen at the exact content width, and reads its height.
 * Runs only after the template fonts are loaded.
 */
export async function measureInvoice(
  vm: InvoiceVM,
  template: TemplateModule,
  paper: PaperSize
): Promise<Measurements> {
  await loadTemplateFonts(template.manifest)
  const host = document.createElement("div")
  host.setAttribute("aria-hidden", "true")
  host.style.cssText =
    "position:absolute;left:-20000px;top:0;visibility:hidden;pointer-events:none;"
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() =>
      root.render(<MeasureTree vm={vm} template={template} paper={paper} />)
    )
    await document.fonts.ready
    const read = (id: string): number => {
      const el = host.querySelector(`[data-m="${CSS.escape(id)}"]`)
      return el ? ceilQuarter(el.getBoundingClientRect().height) : 0
    }
    const rows: Record<string, number> = {}
    const continued: Record<string, number> = {}
    for (const group of vm.groups) {
      for (const row of group.rows) rows[row.id] = read(`row:${row.id}`)
      continued[group.id] = read(`continued:${group.id}`)
    }
    return {
      headerFirst: read("header-first"),
      headerContinuation: read("header-continuation"),
      intro: read("intro"),
      tableHead: read("table-head"),
      footer: read("footer"),
      terminal: read("terminal"),
      rows,
      continued,
    }
  } finally {
    root.unmount()
    host.remove()
  }
}

export const mmToPx = (mm: number): number => (mm * 96) / 25.4

export function contentHeightPx(
  template: TemplateModule,
  paper: PaperSize
): number {
  return mmToPx(contentSizeMm(template, paper).height)
}

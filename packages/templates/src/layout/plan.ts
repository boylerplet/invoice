import type { InvoiceVM, PagePlan, PaperSize, TemplateModule } from "../contract"
import { paginate, type PaginateInput } from "../paginate"
import { contentHeightPx, type Measurements } from "./measure"
import { buildUnits } from "./units"

/** Turns measured block heights into paginate() input and runs it. */
export function planPages(
  vm: InvoiceVM,
  template: TemplateModule,
  paper: PaperSize,
  m: Measurements,
  safety = 1
): PagePlan[] {
  const sizes = buildUnits(vm).map((unit) => ({
    ...unit,
    height: unit.rows.reduce((sum, row) => sum + (m.rows[row.id] ?? 0), 0),
  }))
  const input: PaginateInput = {
    contentHeight: contentHeightPx(template, paper),
    footerHeight: m.footer,
    headerHeight: { first: m.headerFirst, continuation: m.headerContinuation },
    introHeight: m.intro,
    tableHeadHeight: m.tableHead,
    units: sizes.map((u) => ({ id: u.id, groupId: u.groupId, height: u.height, kind: u.kind, isFirstInGroup: u.isFirstInGroup })),
    continuedHeight: m.continued,
    terminalHeight: m.terminal,
    options: { keepLastRowsWithTerminal: template.manifest.options.keepLastRowsWithTerminal, safety },
  }
  return paginate(input)
}

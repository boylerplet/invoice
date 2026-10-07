import type { PagePlan } from "./contract"

export interface Unit {
  id: string
  groupId: string
  height: number
  kind: "item" | "child"
  isFirstInGroup: boolean
}

export interface PaginateInput {
  /** Page height minus top and bottom margins (px). */
  contentHeight: number
  /** Reserved on every page. */
  footerHeight: number
  headerHeight: { first: number; continuation: number }
  /** First page only. */
  introHeight: number
  /** On every page that has rows. */
  tableHeadHeight: number
  /** In order. An item with children contributes [item + first child merged, then each further child]. */
  units: Unit[]
  /** Height of the repeated parent line per groupId; 0 when the option is off. */
  continuedHeight: Record<string, number>
  terminalHeight: number
  options: { keepLastRowsWithTerminal: number; safety: number }
}

export class PaginationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PaginationError"
  }
}

type Variant = "first" | "continuation"

interface DraftPage {
  variant: Variant
  units: Unit[]
  continuedGroupId: string | null
  /** Height taken by the repeated parent line plus the placed rows. */
  used: number
  hasTerminal: boolean
}

const EPS = 1e-6

/**
 * Pure and deterministic: heights in, page plan out. No DOM access.
 * Heights are expected to be pre-rounded up by the measurer.
 */
export function paginate(input: PaginateInput): PagePlan[] {
  const { units, options } = input

  /** Everything on a page that is not table rows. */
  const chrome = (variant: Variant): number =>
    input.footerHeight +
    options.safety +
    (variant === "first" ? input.headerHeight.first + input.introHeight : input.headerHeight.continuation)
  const rowsCapacity = (variant: Variant): number =>
    input.contentHeight - chrome(variant) - input.tableHeadHeight
  const reserveFor = (unit: Unit | undefined): number =>
    unit && !unit.isFirstInGroup ? (input.continuedHeight[unit.groupId] ?? 0) : 0

  for (const unit of units) {
    if (unit.height + reserveFor(unit) > rowsCapacity("continuation") + EPS) {
      throw new PaginationError(
        `A single row (${unit.id}) is taller than an empty page (${unit.height}px > ${rowsCapacity("continuation")}px)`
      )
    }
  }
  if (input.terminalHeight > input.contentHeight - chrome("continuation") + EPS) {
    throw new PaginationError(`The totals block (${input.terminalHeight}px) is taller than an empty page`)
  }

  const openPage = (variant: Variant, first?: Unit): DraftPage => {
    const reserve = reserveFor(first)
    return {
      variant,
      units: [],
      continuedGroupId: reserve > 0 && first ? first.groupId : null,
      used: reserve,
      hasTerminal: false,
    }
  }

  const pages: DraftPage[] = [openPage("first")]
  for (const unit of units) {
    let page = pages[pages.length - 1] as DraftPage
    if (page.used + unit.height > rowsCapacity(page.variant) + EPS) {
      page = openPage("continuation", unit)
      pages.push(page)
    }
    page.units.push(unit)
    page.used += unit.height
  }

  const last = pages[pages.length - 1] as DraftPage
  const free =
    input.contentHeight - chrome(last.variant) - (last.units.length > 0 ? input.tableHeadHeight : 0) - last.used
  if (input.terminalHeight <= free + EPS) {
    last.hasTerminal = true
  } else {
    moveTailWithTerminal(pages, input, reserveFor)
  }

  return pages.map((p, i) => ({
    pageNumber: i + 1,
    variant: p.variant,
    unitIds: p.units.map((u) => u.id),
    continuedGroupId: p.continuedGroupId,
    hasTerminal: p.hasTerminal,
  }))
}

/**
 * The totals do not fit under the last rows. Move the last `keepLastRowsWithTerminal`
 * rows (at least one, fewer if they do not fit) onto a fresh final page with the totals,
 * so the totals never sit alone.
 */
function moveTailWithTerminal(
  pages: DraftPage[],
  input: PaginateInput,
  reserveFor: (unit: Unit | undefined) => number
): void {
  const all = pages.flatMap((p) => p.units)
  const wanted = Math.min(Math.max(1, input.options.keepLastRowsWithTerminal), all.length)
  const available =
    input.contentHeight -
    input.footerHeight -
    input.headerHeight.continuation -
    input.tableHeadHeight -
    input.options.safety

  for (let k = wanted; k >= 1; k--) {
    const tail = all.slice(all.length - k)
    const head = tail[0]
    const reserve = reserveFor(head)
    const rows = tail.reduce((sum, unit) => sum + unit.height, 0)
    if (reserve + rows + input.terminalHeight > available + EPS) continue

    let remaining = k
    for (let i = pages.length - 1; i >= 0 && remaining > 0; i--) {
      const page = pages[i] as DraftPage
      const take = Math.min(remaining, page.units.length)
      page.units.splice(page.units.length - take, take)
      remaining -= take
    }
    // Pages emptied by the move disappear, except the first (it still carries header and intro).
    for (let i = pages.length - 1; i > 0; i--) {
      if ((pages[i] as DraftPage).units.length === 0) pages.splice(i, 1)
    }
    pages.push({
      variant: "continuation",
      units: tail,
      continuedGroupId: reserve > 0 && head ? head.groupId : null,
      used: reserve + rows,
      hasTerminal: true,
    })
    return
  }

  // Even one row plus the totals does not fit: the totals go alone on a final page.
  pages.push({ variant: "continuation", units: [], continuedGroupId: null, used: 0, hasTerminal: true })
}

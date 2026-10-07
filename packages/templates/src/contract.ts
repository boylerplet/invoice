import type { FC } from "react"
import type {
  InvoiceVM,
  RowGroupVM,
  RowVM,
  SupportFlags,
} from "@workspace/shared"

export type { InvoiceVM, RowGroupVM, RowVM }
export type PaperSize = "A4" | "LETTER"
export const PAPER_MM = {
  A4: { w: 210, h: 297 },
  LETTER: { w: 215.9, h: 279.4 },
} as const

export interface FontFaceDef {
  family: string
  /** 400, or [100, 900] for a variable font. */
  weight: number | [number, number]
  style: "normal" | "italic"
  /** Path relative to packages/templates/fonts/. */
  file: string
  /** CSS unicode-range of this file (fonts are split into latin / latin-ext subsets). */
  unicodeRange?: string
  license: "OFL-1.1" | "Apache-2.0" | "ITF-FFL" | "Other"
  /** URL the font was obtained from. */
  source: string
}

export interface ColumnSpec {
  key: "description" | "qty" | "rate" | "amount"
  label: string
  /** CSS grid track: '1fr', '18mm', 'minmax(40mm, 1fr)'. */
  width: string
  align: "left" | "center" | "right"
  /** qty/rate columns disappear if no row uses them. */
  hideWhenEmpty: boolean
}

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface TemplateManifest {
  /** kebab-case, stable forever. */
  id: string
  /** Integer; a released version is immutable. */
  version: number
  name: string
  description: string
  tags: string[]
  /** Page margins in mm. */
  paper: Record<PaperSize, { margins: Margins }>
  fonts: FontFaceDef[]
  /** CSS custom properties (keys start with "--") set on the template root. */
  tokens: Record<string, string>
  columns: ColumnSpec[]
  supports: SupportFlags
  options: {
    /** Totals pinned to the page bottom on the last page, or directly after the rows. */
    terminalAnchor: "bottom" | "flow"
    moneyDecimals: "always" | "auto"
    /** Repeat the parent line ("… (continued)") when a group splits across pages. */
    groupContinuationLabel: boolean
    /** When totals move to a new page, carry this many last rows with them. */
    keepLastRowsWithTerminal: number
  }
}

export interface PageHeaderProps {
  vm: InvoiceVM
  variant: "first" | "continuation"
}
export interface IntroProps {
  vm: InvoiceVM
}
export interface TableHeadProps {
  vm: InvoiceVM
  columns: ColumnSpec[]
}
export interface RowProps {
  vm: InvoiceVM
  row: RowVM
  columns: ColumnSpec[]
  isFirstOnPage: boolean
  isLastOnPage: boolean
  isLastInGroup: boolean
}
export interface TerminalProps {
  vm: InvoiceVM
}
export interface PageFooterProps {
  vm: InvoiceVM
  pageNumber: number
  pageCount: number
}
export interface PageDecorationProps {
  vm: InvoiceVM
  pageNumber: number
  pageCount: number
  variant: "first" | "continuation"
}

/**
 * A template is a manifest plus React components for fixed block slots.
 * Rule: a block's height must not depend on page number, `isFirstOnPage` or
 * `isLastOnPage` (blocks are measured once and reused on any page).
 */
export interface TemplateModule {
  manifest: TemplateManifest
  /** Top of every page. 'first' carries the big title + meta strip; 'continuation' is a compact repeat. */
  PageHeader: FC<PageHeaderProps>
  /** First page only, below the header: parties, reference, anything descriptive. */
  Intro: FC<IntroProps>
  /** Column header row, repeated on every page that has rows. */
  TableHead: FC<TableHeadProps>
  /** One atomic row (never split across pages). */
  Row: FC<RowProps>
  /** Atomic final block: notes, payment details, adjustments, tax, total. */
  Terminal: FC<TerminalProps>
  /** Bottom of every page. Fixed height. */
  PageFooter: FC<PageFooterProps>
  /** Optional absolute-positioned art. Must never affect layout. */
  PageDecoration?: FC<PageDecorationProps>
}

export interface PagePlan {
  pageNumber: number
  variant: "first" | "continuation"
  /** Ids of the paginated units placed on this page. */
  unitIds: string[]
  /** Group whose parent line is repeated at the top of this page, if any. */
  continuedGroupId: string | null
  hasTerminal: boolean
}

export function templateKey(
  manifest: Pick<TemplateManifest, "id" | "version">
): string {
  return `tpl-${manifest.id}-v${manifest.version}`
}

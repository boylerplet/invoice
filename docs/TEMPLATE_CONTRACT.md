# Template contract

Mirrors `packages/templates/src/contract.ts`. **The code wins if they differ.** Update both together.

A template is a TypeScript module of React components plus a declarative manifest. Every template implements the same block slots; the invoice data never changes shape. The same components render the editor preview and the PDF.

## Pipeline

```
InvoiceDoc ──calculate──▶ CalculatedInvoice ──buildInvoiceVM──▶ InvoiceVM        (@workspace/shared)
InvoiceVM + TemplateModule ──measure blocks──▶ paginate() ──▶ PagePlan[]          (@workspace/templates)
PagePlan[] + TemplateModule ──render──▶ <InvoiceDocument> (fixed-size pages) ──▶ preview and PDF
```

Templates contain **no business maths and no data fetching**. They only display strings already prepared in `InvoiceVM`.

## Folder convention

```
packages/templates/src/templates/<id>/v<N>/
  index.tsx      default-exports a TemplateModule
  manifest.ts
  blocks/        PageHeader, Intro, Table (TableHead + Row), Terminal, PageFooter, PageDecoration
  template.css   every selector prefixed .tpl-<id>-v<N>
  assets/        SVG ornaments, thumbnail.png (made by `pnpm template:shots <id> --thumb`)
```

Add a template: create the folder, add its module to `MODULES` in `src/registry.ts`, run `pnpm fonts:add` for any new font, then `pnpm template:shots <id> --thumb` and `pnpm test:e2e` (the conformance suite picks it up automatically). **A released version is immutable**: invoices store `templateId` + `templateVersion`, so a change means a new `v<N+1>` folder.

## Manifest

```ts
export interface FontFaceDef {
  family: string
  weight: number | [number, number] // 400, or [100, 900] for a variable font
  style: "normal" | "italic"
  file: string // relative to packages/templates/fonts/
  unicodeRange?: string // fonts are split into latin / latin-ext subsets; ₹ lives in latin-ext
  license: "OFL-1.1" | "Apache-2.0" | "ITF-FFL" | "Other"
  source: string // URL it was obtained from
}

export interface ColumnSpec {
  key: "description" | "qty" | "rate" | "amount"
  label: string
  width: string // CSS grid track: '1fr', '18mm', 'minmax(40mm, 1fr)'
  align: "left" | "center" | "right"
  hideWhenEmpty: boolean // qty/rate columns disappear if no row uses them
}

export interface TemplateManifest {
  id: string // kebab-case, stable forever
  version: number // integer; a released version is immutable
  name: string
  description: string
  tags: string[]
  paper: Record<PaperSize, { margins: { top: number; right: number; bottom: number; left: number } }> // mm
  fonts: FontFaceDef[]
  tokens: Record<string, string> // CSS custom properties ("--ink": "#111") set on the template root
  columns: ColumnSpec[]
  supports: SupportFlags // dueDate reference paymentTerms notes paymentDetails tax adjustments logo
  options: {
    terminalAnchor: "bottom" | "flow" // totals pinned to the page bottom on the last page, or right after the rows
    moneyDecimals: "always" | "auto"
    groupContinuationLabel: boolean // repeat the parent line when a group splits across pages
    keepLastRowsWithTerminal: number // when totals move to a new page, carry this many last rows with them
  }
}
```

A flag set to `true` promises the template renders that field when data exists (the conformance suite checks it). A flag set to `false` makes the view model hide the field and the editor disable its form section.

## Components

```ts
export interface TemplateModule {
  manifest: TemplateManifest
  PageHeader: FC<{ vm: InvoiceVM; variant: "first" | "continuation" }> // top of every page
  Intro: FC<{ vm: InvoiceVM }> // first page only, below the header
  TableHead: FC<{ vm: InvoiceVM; columns: ColumnSpec[] }> // repeated on every page that has rows
  Row: FC<{ vm: InvoiceVM; row: RowVM; columns: ColumnSpec[]; isFirstOnPage: boolean; isLastOnPage: boolean; isLastInGroup: boolean }> // one atomic row
  Terminal: FC<{ vm: InvoiceVM }> // atomic final block: notes, payment, adjustments, tax, total
  PageFooter: FC<{ vm: InvoiceVM; pageNumber: number; pageCount: number }> // fixed height
  PageDecoration?: FC<{ vm: InvoiceVM; pageNumber: number; pageCount: number; variant: "first" | "continuation" }> // absolute art, never affects layout
}
```

`InvoiceVM`, `RowVM` and `RowGroupVM` are defined in `packages/shared/src/vm.ts` (see that file for every field). Notes that matter when designing:

- `row.kind` is `item`, `child` or `continued` (the repeated parent line; show "(continued)").
- `row.qty` is `null` for flat charges: **leave the cell empty, never print 1**. `row.unit` is only set together with `qty`. Print `qty unit` yourself.
- Row `rate` and `amount` strings carry **no currency symbol**; only `vm.total` does. `vm.currency.symbol` is available if you want it elsewhere.
- Pricing modes (`row.pricing`): `explicit` parent shows qty/rate/amount; `rollup` parent shows only an amount and its children carry the fees; `none` has no amounts.
- `vm.hasQty` / `vm.hasRate` tell you whether those columns are in use; the renderer already hides columns marked `hideWhenEmpty`.

## Geometry and CSS rules (enforced by the renderer and the conformance suite)

- A page is a `div.tpl-page` of exactly the paper size in mm with the manifest margins as padding, `overflow: hidden`, `position: relative`, `break-after: page` (not after the last page). Inside: header, intro (first page), table head + rows, spacer, terminal (last page), footer, in a flex column. The page element itself also carries the template class and tokens.
- All template CSS is scoped under `.tpl-<id>-v<N>`. No app theme variables, no Tailwind classes. Plain CSS with **mm / pt / px** only; never `vh` or `vw`.
- Rows and the head use CSS grid with `grid-template-columns: var(--tpl-cols)`. The renderer computes `--tpl-cols` from the visible columns, so every row aligns. **No `<table>` elements.**
- A block's height is measured once and reused on any page, so it must **not depend on the page number, `isFirstOnPage` or `isLastOnPage`**. Rows are atomic and must not use collapsing margins: use padding and borders, so measured height equals rendered height. (Blocks are wrapped in `display: flow-root`.)
- Amounts: `font-variant-numeric: tabular-nums`, right aligned. Long text wraps (`overflow-wrap: anywhere`). Never truncate content.
- Images (logo) need an explicit width/height or max size so their height is known at measure time.
- Everything must print identically (`print-color-adjust: exact`). No animation, no hover styles, no `position: fixed`.
- Fonts must contain `₹ $ – · •`. A glyph that falls back to another font is a bug. Fonts are local files under `packages/templates/fonts/`; their licences are recorded in `fonts/LICENSES.md` (`pnpm fonts:add` does it).

## Pagination (summary)

`paginate()` is a pure function of measured heights. Rows never split. An item is merged with its first child into one unit so a parent line is never orphaned. When the totals block does not fit under the last row, the last `keepLastRowsWithTerminal` rows (at least one) move to a new final page with it, so totals never sit alone. See `packages/templates/src/paginate.ts` and its tests.

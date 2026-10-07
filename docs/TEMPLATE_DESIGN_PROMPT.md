# TEMPLATE DESIGN PROMPT — add one invoice template to Invoice Studio

You are adding **one new invoice template** to an existing app, Invoice Studio. Run this prompt once per template. Do not touch app code, other templates, or released template versions. Everything you need is below; the contract file in the repo is the source of truth, so read it first.

## 0. Fill this in before running (the user edits this block)

```
TEMPLATE NAME:            <e.g. "Ledger">
TEMPLATE ID (kebab-case): <e.g. ledger>      (must not already exist in the registry)
MOOD / DIRECTION:         <e.g. editorial, warm, serif headings, lots of white space>
REFERENCES:               <paths to images/PDFs in docs/reference/, or URLs the user pasted; say what to take from each: colour, type, header graphic, table style, spacing>
DO / DON'T:               <e.g. no filled header band; keep it black and one green accent>
FONT PREFERENCE:          <specific open-source fonts, or "you choose">
HEADER GRAPHIC IDEAS:     <optional: rule styles, shapes, corner ornaments>
TABLE STYLE IDEAS:        <optional: hairlines only / zebra / boxed header / dotted leaders>
LOGO PLACEMENT:          <top-left | top-right | centered | none-use-wordmark>
```

If a field is left blank, decide yourself and record the decision in the template's `README.md`.

## 1. What you are working in

Invoice Studio renders an invoice from structured data through a template. A template is a **TypeScript module of React components plus a manifest**. A pure paginator decides page breaks from heights measured in the browser, and the same rendered pages are shown in the preview and printed to PDF by Puppeteer. Your job is **visual design**: typography, colour, rules, spacing, ornaments, and the arrangement of the blocks. You do not change what data exists or how it is calculated.

Consequences you must respect:
- The data shape is fixed (the `InvoiceVM` below). You may not add fields. You choose which fields to display and where, within each block.
- Rows are atomic; the paginator never splits a row. Heights are measured, so your design adapts to any number of items automatically.
- No business logic: no math, no date parsing, no currency formatting. Everything arrives pre-formatted.

## 2. Orient yourself first (do this before designing)

1. Read `packages/templates/src/contract.ts` and `docs/TEMPLATE_CONTRACT.md` (the code wins if they differ).
2. Read the existing template `packages/templates/src/templates/studio/v1/` completely (manifest, blocks, CSS). It is the reference implementation of the contract. Match its file structure.
3. Read `packages/templates/src/registry.ts`, `packages/templates/fonts/LICENSES.md`, and list `packages/templates/fixtures/`.
4. View every reference image/PDF given in section 0 (use the Read tool on the files). Extract: type, colour, rule weights, spacing rhythm, header composition, table treatment, ornaments, total block treatment.
5. Write a short **design brief** (≤ 25 lines) in `packages/templates/src/templates/<id>/README.md`: palette (hex tokens), fonts and why, type scale, rule weights, header composition for first and continuation pages, table treatment, child-row treatment, terminal arrangement, ornament description, and which `supports` flags are on. Build from that brief.

## 3. The contract (reference copy)

```ts
import type { FC } from 'react';

export type PaperSize = 'A4' | 'LETTER';
export const PAPER_MM = { A4: { w: 210, h: 297 }, LETTER: { w: 215.9, h: 279.4 } } as const;

export interface FontFaceDef {
  family: string; weight: number | [number, number]; style: 'normal' | 'italic';
  file: string;                       // relative to packages/templates/fonts/
  license: 'OFL-1.1' | 'Apache-2.0' | 'ITF-FFL' | 'Other'; source: string;
}
export interface ColumnSpec {
  key: 'description' | 'qty' | 'rate' | 'amount';
  label: string; width: string;       // CSS grid track: '1fr', '18mm', 'minmax(40mm,1fr)'
  align: 'left' | 'center' | 'right';
  hideWhenEmpty: boolean;             // qty / rate columns vanish if no row uses them
}
export interface TemplateManifest {
  id: string; version: number; name: string; description: string; tags: string[];
  paper: Record<PaperSize, { margins: { top: number; right: number; bottom: number; left: number } }>; // mm
  fonts: FontFaceDef[];
  tokens: Record<string, string>;     // CSS custom properties applied on the template root
  columns: ColumnSpec[];
  supports: { dueDate: boolean; reference: boolean; paymentTerms: boolean; notes: boolean; paymentDetails: boolean; tax: boolean; adjustments: boolean; logo: boolean };
  options: {
    terminalAnchor: 'bottom' | 'flow';
    moneyDecimals: 'always' | 'auto';
    groupContinuationLabel: boolean;
    keepLastRowsWithTerminal: number;
  };
}
export interface RowVM {
  id: string; kind: 'item' | 'child' | 'continued';
  pricing: 'explicit' | 'rollup' | 'none';
  description: string; detail: string | null;
  qty: string | null;                 // formatted; null => leave the cell EMPTY (never print 1 or a dash placeholder unless your design deliberately uses a dash for empty cells)
  unit: string | null; rate: string | null; amount: string | null;
  isGroupParent: boolean;
}
export interface RowGroupVM { id: string; rows: RowVM[] }
export interface InvoiceVM {
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  paper: PaperSize; number: string; issueDate: string; dueDate: string | null;
  reference: string | null; paymentTerms: string | null;
  currency: { code: string; symbol: string };
  issuer: { displayName: string; legalName: string | null; addressLines: string[]; email: string | null; phone: string | null; website: string | null; taxIds: { label: string; value: string }[]; logoUrl: string | null };
  client: { name: string; contactPerson: string | null; addressLines: string[]; email: string | null; phone: string | null; taxIds: { label: string; value: string }[] };
  groups: RowGroupVM[]; hasQty: boolean; hasRate: boolean;
  adjustments: { label: string; amount: string; kind: 'discount' | 'charge' }[];
  subtotal: string; tax: { label: string; rate: string; amount: string } | null; total: string;
  notes: string | null;
  payment: { title: string; lines: { label: string; value: string }[] } | null;
}
export interface TemplateModule {
  manifest: TemplateManifest;
  PageHeader: FC<{ vm: InvoiceVM; variant: 'first' | 'continuation' }>;
  Intro: FC<{ vm: InvoiceVM }>;                                        // first page only
  TableHead: FC<{ vm: InvoiceVM; columns: ColumnSpec[] }>;             // repeated on each page with rows
  Row: FC<{ vm: InvoiceVM; row: RowVM; columns: ColumnSpec[]; isFirstOnPage: boolean; isLastOnPage: boolean; isLastInGroup: boolean }>;
  Terminal: FC<{ vm: InvoiceVM }>;                                      // atomic: notes, payment, adjustments, tax, total
  PageFooter: FC<{ vm: InvoiceVM; pageNumber: number; pageCount: number }>;
  PageDecoration?: FC<{ vm: InvoiceVM; pageNumber: number; pageCount: number; variant: 'first' | 'continuation' }>;
}
```

### What each block must do
- **PageHeader `first`**: identifies the document ("Invoice"/"Tax invoice" wording is up to design, use "Invoice"), shows issuer identity (logo if `vm.issuer.logoUrl` and `supports.logo`, otherwise a wordmark from `displayName`), the invoice number, issue date, and (if present and supported) due date and reference. **`continuation`**: compact repeat with at least title, number and issue date; it must be visibly shorter than `first`.
- **Intro**: From (issuer) and Bill to (client) with all available lines, including tax IDs using their stored labels. Print only values that exist; never print empty labels or placeholders.
- **TableHead / Row**: align via `grid-template-columns: var(--tpl-cols)` (set by the renderer from the visible columns). Item rows show `description` (+ `detail` if present). Child rows are visually subordinate (indent, size, colour, tree line or bullet; your call). `qty` and `unit` display together (e.g. `12 hrs`); empty when `qty` is null. `amount` is null for unpriced/`none`-mode rows and for rollup parents with no priced children: leave empty. A `continued` row repeats the parent description, subdued, with a "(continued)" cue.
- **Terminal**: arrange notes, payment details, adjustments, tax and total as the design wants. The **total** must be the clearest element. Print only what exists. Must fit a single page.
- **PageFooter**: fixed height; includes `Page {pageNumber} of {pageCount}`.
- **PageDecoration**: purely visual, `position:absolute`, `pointer-events:none`, never affects layout, must not reduce legibility.

## 4. Hard rules (the renderer and tests enforce these)

1. **Scoped CSS.** All selectors under `.tpl-<id>-v<version>`. Plain CSS, one `template.css`. No Tailwind, no app theme variables, no global selectors, no `!important` wars.
2. **Units:** `mm`, `pt`, `px`, `em`. Never `vh`, `vw`, `%` heights, or viewport-relative sizing. Page size is fixed by the renderer.
3. **Layout:** CSS grid/flex only. **No `<table>`.** No margin collapsing: use padding and borders so measured height equals rendered height; every row root is `display: flow-root`. No `position: fixed`, no animation, no hover/focus styles.
4. **Deterministic heights:** images need explicit width/height or max-size (the logo: `max-width`/`max-height` in mm). Don't rely on content that loads after layout.
5. **Text:** always wrap long words (`overflow-wrap: anywhere`); never truncate or clamp content. Amounts: `font-variant-numeric: tabular-nums`, right-aligned.
6. **Print:** colours must survive `print-color-adjust: exact`. Backgrounds and borders are fine. Avoid sub-0.25 pt hairlines (they vanish in PDF); use ≥ 0.25 pt, preferably 0.3–0.5 pt.
7. **Fonts:** open-source only and local. Add them with the repo script, never via CDN or `@import url(...)`:
   `pnpm fonts:add --family "<Family>" --source fontsource --weights 400,500,600,700 --subsets latin,latin-ext`
   or for a manually downloaded Fontshare/Google zip: `pnpm fonts:add --source file --zip <path> --license OFL-1.1 --url <source-url>`.
   Include `latin-ext`: the rupee sign `₹` lives there. Verify `₹`, `$`, `–`, `·` render in your font, not a fallback (inspect the screenshots). If your display font lacks `₹`, use it only for text and set amounts/currency in a font that has it. Make sure `fonts/LICENSES.md` has a row for every family, and prefer OFL-1.1 or Apache-2.0 (warn the user if you use anything else).
8. **Supports flags** must be truthful: set a flag `false` only if the template genuinely does not display that field; the editor will then disable it. Prefer supporting everything.
9. **Both paper sizes.** Margins are given per paper size in the manifest. The design must look intentional on A4 and Letter (Letter is shorter and wider).
10. **No logic:** do not compute totals, re-format money/dates, or reorder data. If you need something the VM lacks, do not add it; adapt the design.
11. **Immutability:** create `templates/<id>/v1/`. Never modify another template's folder. If asked to change a released template, create `v2` instead.
12. **Name collisions:** do not reuse an existing id.

## 5. Process

1. Orientation and design brief (section 2).
2. Fonts: add them, confirm glyphs.
3. Scaffold `packages/templates/src/templates/<id>/v1/` (copy the `studio/v1` structure: `index.tsx`, `manifest.ts`, `blocks/*`, `template.css`, `assets/`, `README.md`). Rename the CSS root class.
4. Implement blocks. Build the manifest tokens first (colours, sizes) and drive the CSS from them so the whole palette can be adjusted in one place.
5. Register: add one line to `packages/templates/src/registry.ts`. Change nothing else outside the template folder, `fonts/`, and `LICENSES.md`.
6. Verify (section 6). Iterate until it is clean.
7. Generate the thumbnail used in settings: `pnpm template:shots <id> --version 1 --thumb`.

## 6. Verification (mandatory, do not skip)

Run `pnpm template:shots <id> --version 1`. It renders every fixture on A4 and Letter to `.template-shots/<id>/v1/<scenario>-<paper>-p<k>.png`. **View the images** (Read tool) and compare against the references. Check, per fixture:

- `minimal-1-item`, `typical-5-items`: the page looks finished, not empty; the terminal is pinned correctly (if `terminalAnchor: 'bottom'`).
- `with-notes-and-payment`, `tax-and-adjustments`: terminal is balanced; total is the clearest element; discount shows as negative.
- `nested-priced-rollup`, `nested-descriptive-explicit`, `nested-mixed-priced-unpriced`, `flat-no-qty`: parent/child hierarchy is clear; **empty quantity cells are empty**, not "1"; empty amounts leave no stray symbols.
- `long-descriptions`, `max-length-fields`: nothing clips, overlaps or overflows; rows grow.
- `forty-items-multipage`, `big-group-spanning-pages`: header continuation + table head repeat on every page; footer shows correct `Page X of Y`; continued label (if enabled) appears; no page has only a totals block alone; no clipped rows at page bottoms.
- `terminal-just-overflows-page`: last rows move with the terminal; no orphaned totals.
- `usd-letter`, `no-due-date-no-reference`: Letter layout intact; missing fields leave no gaps or placeholders (meta strip re-flows).
- Logo present vs absent (the fixtures cover both): wordmark fallback looks deliberate.

Then run `pnpm typecheck && pnpm lint && pnpm test` (the template test suite renders every fixture and fails on overflow, missing glyphs and unsupported flags) and open `/dev/templates/<id>` in the template lab to confirm there are no console errors or overflow badges.

Fix every issue found. Re-run the screenshots after each fix. Do not report done on the first pass.

## 7. Anti-patterns (do not do)
Absolute-positioning flowing content · fixed row heights · `table` tags · fonts from a CDN · hard-coded currency symbols or "₹" literals · printing "1" or "-" for missing quantities · filling empty values with placeholders like "N/A" or "------" · dropping hairlines under 0.25 pt · editing the paginator, renderer, contract or another template to make your design fit · heavy full-bleed backgrounds that waste ink (a tint band or one restrained graphic is fine) · decorative elements that carry meaning (decoration must be removable without losing information).

## 8. Deliverables and final report
- `packages/templates/src/templates/<id>/v1/` complete with `README.md` (design brief and decisions).
- Fonts added with licences recorded. Registry updated by one line.
- Thumbnail generated.
- Final message, short: template name/id, fonts and licences, the 3 design choices that define it, any compromises, the screenshot folder path, and confirmation that typecheck, lint and tests pass.

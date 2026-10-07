# BUILD PROMPT — Invoice Studio v0.0.1

You are building **Invoice Studio** end to end: a local-first invoice application for a small design/software studio. Read this whole document first, then also read `CLAUDE.md`. Work through the phases in section 13 in order, without asking questions. Where this spec is silent, decide, and log the decision as one line in `docs/DECISIONS.md`.

At the very start, copy this file to `docs/BUILD_PROMPT.md` and `CLAUDE.md` to the repo root. Put `/reference/template-01.png` (supplied by the user, if present) in `docs/reference/`. That image is **mood and content inspiration only, not a spec**. It is an amateur invoice; Template 01 must follow invoicing best practice and the design brief in section 8.9, not copy the image.

---

## 1. Product summary

- Web app, runs on localhost now, to be moved to a LAN/home server later. One user login per business ("workspace"). The user and their partner share the one login.
- The user creates **service invoices** (no goods, no GST machinery in v1). Clients are grouped as folders. Invoices carry a status lifecycle.
- The editor is an **adjustable split screen**: form on the left, live preview on the right. The preview is a vertical stack of real A4/Letter pages you scroll like a PDF, with zoom.
- Output must look **designed**, not generic: custom fonts, placeable/resizable logo, fancy table rules, separators and header graphics, all defined by templates. Structure stays the same across templates.
- PDF export is server-side (Puppeteer) and **identical** to the preview: same page count, same breaks.
- Templates are developer-authored (5–8 eventually). Only **one** ships in v0.0.1 (Template 01). A separate prompt (`TEMPLATE_DESIGN_PROMPT.md`) will be used later to add more, so the template system must be clean, documented and easy to extend.

## 2. Locked decisions

| Area | Decision |
|---|---|
| Frontend | Vite + React + TypeScript SPA, React Router, TanStack Query, Zustand (editor/preview/zoom state), React Hook Form + Zod |
| UI kit | shadcn/ui via this exact command: `npx shadcn@latest init --preset b2zmLdDcpe --template vite --monorepo --pointer`. After init, treat the generated `globals.css` and theme tokens as the source of truth. Do not hand-invent a different theme. Use `Resizable`, `Sheet`, `Dialog`, `Command`, `Table`, `Tabs`, `Sonner`, etc. from the shadcn set as needed. |
| Backend | Node + Hono, REST JSON under `/api`, zod-validated, serves the built web app in production |
| DB | SQLite (better-sqlite3) + Drizzle ORM + SQL migrations. File at `data/invoice.db`. WAL mode. |
| Storage | Logos on disk in `data/uploads/` (never base64 in DB). PDFs generated on demand, not stored. |
| PDF | Puppeteer printing `/print/:id`; fixed-size explicit pages; `preferCSSPageSize`, `printBackground`, zero margins |
| Money | Integer minor units, big.js, half-up rounding. Currencies: **INR** (default) and **USD**. Currency is chosen per invoice (dropdown) with a workspace default. INR uses Indian grouping (₹1,00,000.00), USD uses Western ($100,000.00). Design the currency list so AED, GBP etc. can be added by editing one config file. |
| Fonts | Open source only, bundled locally (Fontsource, or manually imported from Fontshare/Google with licence recorded). Template 01 uses Inter. |
| Auth | Username + password, argon2id, httpOnly session cookie. **One login = one workspace**, no workspace switching. No signup page. Users are created by CLI (`pnpm user:create`) and by the seed. No in-app user admin. |
| Tax | Single optional invoice-level tax line (label + percentage). No GST engine in v1. Client "Tax IDs" (e.g. GSTIN) are stored and printed as plain info only. |
| Status | DRAFT, ISSUED, PAID, CANCELLED. OVERDUE is derived. No partial payments. |

## 3. Repo layout and tooling

Run the shadcn command above first; it creates the monorepo with `apps/web` and `packages/ui`. Then add:

```
apps/
  web/                    Vite React SPA (created by shadcn)
  server/                 Hono API, DB, auth, PDF, CLI scripts
packages/
  ui/                     shadcn components (created by shadcn)
  shared/                 domain: types, zod schemas, money, calc, numbering, lifecycle, formatters
  templates/              template contract, registry, templates/, paginator, renderer, fonts/, fixtures/
docs/
  BUILD_PROMPT.md  DECISIONS.md  POSSIBLE_ADDITIONS.md  TEMPLATE_CONTRACT.md  reference/
data/                     gitignored: invoice.db, uploads/
```

Root scripts (see `CLAUDE.md`): `pnpm dev` runs web (5173, proxies `/api` and `/uploads` to the server) and server (3001) together. `pnpm build` then `pnpm start` serves everything from the server on `PORT` (default 3001), bound to `HOST` (default `127.0.0.1`). Provide `.env.example`: `PORT, HOST, DATA_DIR, SESSION_SECRET, PRINT_SECRET, COOKIE_SECURE, PUPPETEER_EXECUTABLE_PATH, DEFAULT_TIMEZONE`. Generate random secrets on first run if absent and write them to `data/secrets.json`.

Quality gates: TypeScript strict, ESLint, Prettier, Vitest. `pnpm typecheck && pnpm lint && pnpm test` must be green at the end of every phase.

---

## 4. Domain (`packages/shared`)

Everything here is pure TypeScript with zod schemas, usable by both server and web, fully unit-tested.

### 4.1 Money and quantity
- `Minor` = safe integer (paise/cents). Reject non-safe-integers.
- Quantity is a **decimal string** (max 3 decimals, e.g. `"2.5"`), or `null` (see 4.3). Percentages are decimal strings.
- All arithmetic through big.js with half-up rounding to a minor unit.
- `currencies.ts`: `{ INR: { symbol:'₹', minorDigits:2, grouping:'indian', locale:'en-IN' }, USD: { symbol:'$', minorDigits:2, grouping:'western', locale:'en-US' } }`. `formatMoney(minor, code, {decimals:'always'|'auto'})` implemented without relying on `Intl` quirks for the Indian grouping (test it: 10000000 paise → `₹1,00,000.00`; 123456789 → `₹12,34,567.89`).
- `parseMoneyInput(str, code)` for form fields (accepts `1,00,000.5`, `100000`, `$1,200`) → Minor or error.

### 4.2 Invoice document (what is stored, semantic only)

```ts
type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
type Pricing = 'explicit' | 'rollup' | 'none';

interface InvoiceDoc {
  schemaVersion: 1;
  type: 'INVOICE';                 // reserved for QUOTE etc. later; only INVOICE is exposed in v1
  number: string;                  // "INV-2026-0004"
  issueDate: string;               // YYYY-MM-DD
  dueDate: string | null;
  currency: 'INR' | 'USD';
  reference: string | null;        // PO / project reference, optional, shown only if template supports
  paymentTerms: string | null;     // e.g. "Due within 15 days"

  issuer: IssuerSnapshot;          // copied from the profile at creation; editable per invoice
  client: ClientSnapshot;          // copied from the client at creation; editable per invoice
  payment: PaymentSnapshot | null; // null => payment details section off

  items: Item[];                   // at least 1
  adjustments: Adjustment[];       // invoice-level discounts / extra charges
  tax: { enabled: boolean; label: string; rate: string };   // rate as percent string
  notes: string | null;            // null => notes section off (max 800 chars)

  presentation: { templateId: string; templateVersion: number; paperSize: 'A4' | 'LETTER' };
}

interface Item {
  id: string;                      // uuid
  description: string;             // max 200 chars
  detail: string | null;           // optional second line, max 300 chars
  pricing: Pricing;
  qty: string | null;              // used when pricing === 'explicit'; null => flat charge
  unit: string | null;             // "hrs", "screens"; only meaningful with qty
  rate: Minor | null;              // required when 'explicit'
  children: Child[];               // max 1 level, max 20 per item
}
interface Child {
  id: string;
  description: string;             // max 200 chars
  qty: string | null;              // optional. null => flat fee (never shown as 1)
  unit: string | null;
  rate: Minor | null;              // null => no fee (descriptive child)
}
interface Adjustment { id: string; label: string; kind: 'discount' | 'charge'; valueType: 'fixed' | 'percent'; value: string /* minor for fixed, percent string for percent */ }
```

`IssuerSnapshot`: `profileId, displayName, legalName|null, addressLines[], email|null, phone|null, website|null, taxIds:{label,value}[], logoFile|null`.
`ClientSnapshot`: `clientId, name, contactPerson|null, addressLines[], email|null, phone|null, taxIds:{label,value}[]`.
`PaymentSnapshot`: `accountId, title ("Payment details"), lines: {label, value}[]` (ordered, e.g. A/C Holder Name, A/C Number, IFSC, Bank, UPI).

Snapshots are what render and what export. Editing a client or profile later never alters existing invoices. In a DRAFT, offer a "Refresh from client / profile" action.

### 4.3 Line-item pricing rules (final)
The **parent** row is what is totalled.
- `explicit`: parent has `rate`. If `qty` is set, amount = qty × rate; if `qty` is null, amount = rate (flat charge). Children are **descriptive only**: they have no fee and the form hides their fee inputs in this mode.
- `rollup`: parent amount = sum of the children's amounts. Each child may have `rate` (with or without `qty`) or no rate at all. A child with no rate contributes 0 and shows no amount. Parent qty/rate inputs are hidden.
- `none`: no amount for the parent or children; children are plain description lines.
- A child with `qty` but no `rate` is invalid. An `explicit` parent without `rate` is invalid.
- **A missing quantity is never shown as "1".** The quantity cell is empty. If `unit` is set without qty, ignore the unit.
- Only the parent's computed amount enters the invoice subtotal. A child amount is never added on top of a parent amount (guard this with tests: no double counting).
- Children are one level deep only; enforce in the zod schema and the UI.

### 4.4 Calculation engine (`calculate(doc) → CalculatedInvoice`)
Order: item amounts → `subtotal` (sum of parent amounts) → each adjustment amount (percent adjustments are of `subtotal`, never compounding; discounts are negative, charges positive) → `taxable = subtotal + adjustments` (must be ≥ 0, else validation error) → `taxAmount = round(taxable × rate/100)` if tax enabled → `total = taxable + taxAmount`. Output per-item/child computed amounts (`Minor | null`) plus all totals. It is deterministic, has no side effects, and runs identically in web and server. The server recomputes `totalMinor` on every save and ignores any client-supplied totals.

### 4.5 View model
`buildInvoiceVM(doc, calculated, {locale/currency formatting, templateManifest})` → `InvoiceVM` (formatted strings, ready for templates; types in section 8.2). Dates formatted as `15 Apr 2026`. It applies `manifest.supports` (e.g. hides a field the template can't show), flattens items into `RowGroupVM[]`, and computes `hasQty` / `hasRate` flags (any row has a qty / any row has a rate) so templates can auto-hide empty columns.

### 4.6 Numbering
Workspace numbering settings:
```ts
{ prefix:'INV', separator:'-', period:'calendar'|'financial'|'none', fyStartMonth:4, padding:4, startNumber:1, resetEachPeriod:true }
```
- Default output: `INV-2026-0001` (calendar year). With `period:'financial'` and FY Apr–Mar: `INV-26-27-0001`. With `none`: `INV-0001`. Separator is configurable (`-`, `/`, `_`, none).
- Padding is a minimum width only: number 10000 prints `INV-2026-10000`. The counter is an integer with no cap.
- Sequence state: table `number_sequences(workspaceId, periodKey, lastValue)`. Allocation happens inside a `BEGIN IMMEDIATE` transaction. If the candidate number is already taken (including soft-deleted/cancelled invoices) skip to the next free one.
- Numbers are **never reused**: unique index on `(workspaceId, number)` across all rows including deleted.
- Manual override: the user may type any number; validated unique and ≤ 32 chars of `[A-Za-z0-9/_-]`. If it matches the current pattern and period and its counter is above `lastValue`, advance the sequence so auto numbers don't collide later.
- A number is allocated when the invoice is created (drafts included). The period key is taken from the issue date at creation.
- Provide `previewNextNumber(settings, date)` for the settings page (live preview of the format).

### 4.7 Lifecycle and revisions (`lifecycle.ts`, pure)
```
DRAFT --issue--> ISSUED --markPaid(paidDate)--> PAID --reopen--> ISSUED
DRAFT --discard--> (soft deleted, deletedAt set; number stays reserved)
ISSUED --cancel(reason?)--> CANCELLED   (terminal; can be duplicated)
```
- Editable: DRAFT (autosave, no revisions) and ISSUED (explicit **Save changes**, each save writes a revision snapshot). PAID and CANCELLED are read-only. Reopen PAID → ISSUED needs a confirm dialog and is logged.
- **Issue** happens when the user exports a PDF (the dialog offers "Export & mark as issued" and "Download without issuing") or presses "Mark as issued". Issuing writes revision 1 ("Issued").
- Each ISSUED save increments `revision`, stores the full `InvoiceDoc` JSON snapshot + total + optional change note. A History page lists revisions with date, total and note, allows read-only preview of any revision, and "Restore as new revision".
- Derived `isOverdue(inv, today)`: `status === 'ISSUED' && dueDate !== null && dueDate < today`. Aging buckets by days past due: not yet due, 1–30, 31–60, 61+.
- "Duplicate" creates a new DRAFT (new number) from any invoice, dates reset to today.

---

## 5. Database (Drizzle, SQLite)

All tables carry `workspaceId` except `workspaces`; every repository function requires it. Timestamps are ISO strings. IDs are UUIDv7 or UUIDv4 text.

- `workspaces`: id, name, timezone, settings JSON (zod-validated: default currency, default paper size, default templateId, default due days (e.g. 15), numbering settings, default payment terms text, default notes text).
- `users`: id, workspaceId, username (unique, case-insensitive), passwordHash, createdAt.
- `sessions`: id (sha256 of token), userId, expiresAt, createdAt, lastSeenAt.
- `issuer_profiles`: id, workspaceId, displayName, legalName, addressLines JSON, email, phone, website, taxIds JSON, logoFile, defaultPaymentAccountId, isDefault, archivedAt.
- `payment_accounts`: id, workspaceId, issuerProfileId (nullable = usable by all), label ("HDFC current – Menon Design Co."), currency, kind ('bank'|'upi'|'other'), lines JSON (`[{label,value}]` ordered), archivedAt.
- `clients`: id, workspaceId, name, contactPerson, addressLines JSON, email, phone, taxIds JSON, defaultIssuerProfileId, defaultPaymentAccountId, defaultCurrency, defaultDueDays, notes (internal), archivedAt.
- `invoices`: id, workspaceId, number, status, deletedAt, issueDate, dueDate, currency, clientId, issuerProfileId, totalMinor, paidAt, paidNote, cancelledAt, cancelReason, templateId, templateVersion, paperSize, revision, data JSON (`InvoiceDoc`), createdAt, updatedAt. Indexes: (workspaceId, status), (workspaceId, issueDate), (workspaceId, clientId), unique (workspaceId, number).
- `invoice_revisions`: id, workspaceId, invoiceId, revision, data JSON, totalMinor, note, createdAt.
- `number_sequences`: workspaceId, periodKey, lastValue (PK on both).
- `activity_log`: id, workspaceId, at, userId, invoiceId nullable, clientId nullable, type (`invoice.created|edited|issued|paid|reopened|cancelled|deleted|restored|exported|duplicated|client.created|…`), summary text, meta JSON.

Migrations via drizzle-kit, run automatically on server start. `pnpm db:reset` wipes `data/invoice.db` and re-migrates.

## 6. API (Hono, `/api`, all JSON, zod-validated, 401 unless a valid session)

```
POST /auth/login  POST /auth/logout  GET /auth/me  POST /auth/change-password
GET/PUT /workspace                       (name, timezone, settings)
CRUD /issuer-profiles   POST /issuer-profiles/:id/logo (multipart, png/jpg/svg/webp ≤ 2 MB, validated by magic bytes; SVG sanitized or rasterization-safe)  DELETE logo
CRUD /payment-accounts
CRUD /clients (+ archive)   GET /clients/:id/summary (billed, paid, outstanding per currency, invoice count)
GET /invoices?view=&status=&clientId=&profileId=&q=&from=&to=&trash=&sort=      (list rows only: no heavy data JSON)
POST /invoices (from clientId + defaults)   GET /invoices/:id
PUT /invoices/:id            (DRAFT autosave; ISSUED save with {changeNote}; rejects PAID/CANCELLED with 409)
POST /invoices/:id/issue | /pay {paidDate, note} | /reopen | /cancel {reason} | /duplicate | /discard | /restore
GET /invoices/:id/revisions   GET /invoices/:id/revisions/:rev
GET /invoices/:id/pdf?issue=true|false     (server-generated; streams application/pdf with a proper filename)
POST /invoices/next-number-preview
GET /dashboard   (totals per currency, aging buckets, top clients by outstanding, recent)
GET /activity?cursor=
GET /export/backup   (full JSON of everything in the workspace + uploads list; also a ZIP including upload files)
```
Validation errors return `{ error: { code, message, fields? } }`. State-transition errors return 409. CSRF: SameSite=Lax cookies plus an Origin/Host check on mutating requests. Simple login rate limit (5 failures per 15 min per username+IP, in memory).

## 7. Auth
- argon2id (`@node-rs/argon2`). Session token is 32 random bytes, only its sha256 is stored; cookie `sid` is httpOnly, SameSite=Lax, `Secure` when `COOKIE_SECURE=true`, 30-day sliding expiry.
- `pnpm user:create --username <u> --password <p> --workspace "<Business name>"`. If the workspace doesn't exist it is created with sensible default settings. `--workspace-id` attaches to an existing one (several logins may share a workspace, but one login belongs to exactly one).
- Web: `/login` page; everything else behind a guard. 401 → redirect to login. Settings → Account has change password.

---

## 8. Template system (the core of the product)

### 8.1 Layers
```
InvoiceDoc ──calculate──▶ CalculatedInvoice ──buildInvoiceVM──▶ InvoiceVM
InvoiceVM + TemplateModule ──measure blocks──▶ paginate() ──▶ PagePlan[]
PagePlan[] + TemplateModule ──render──▶ <InvoiceDocument> (explicit pages)  ──▶ preview and PDF
```
A template is a **TypeScript module of React components plus a declarative manifest** (not a JSON blob). It is code because the designs (rules, graphics, SVG ornaments) need real markup. It is *controlled*: every template implements the same block slots; the data never changes shape.

### 8.2 Contract: create exactly this in `packages/templates/src/contract.ts` and mirror it in `docs/TEMPLATE_CONTRACT.md`

```ts
import type { FC } from 'react';

export type PaperSize = 'A4' | 'LETTER';
export const PAPER_MM = { A4: { w: 210, h: 297 }, LETTER: { w: 215.9, h: 279.4 } } as const;

export interface FontFaceDef {
  family: string;
  weight: number | [number, number];     // 400 or [100, 900] for variable
  style: 'normal' | 'italic';
  file: string;                           // path relative to packages/templates/fonts/
  license: 'OFL-1.1' | 'Apache-2.0' | 'ITF-FFL' | 'Other';
  source: string;                         // URL it was obtained from
}

export interface ColumnSpec {
  key: 'description' | 'qty' | 'rate' | 'amount';
  label: string;
  width: string;                          // CSS grid track: '1fr', '18mm', 'minmax(40mm, 1fr)'
  align: 'left' | 'center' | 'right';
  hideWhenEmpty: boolean;                 // qty/rate columns disappear if no row uses them
}

export interface TemplateManifest {
  id: string;                             // kebab-case, stable forever
  version: number;                        // integer; a released version is immutable
  name: string;
  description: string;
  tags: string[];
  paper: Record<PaperSize, { margins: { top: number; right: number; bottom: number; left: number } }>; // mm
  fonts: FontFaceDef[];
  tokens: Record<string, string>;         // CSS custom properties set on the template root: colours, sizes, radii
  columns: ColumnSpec[];
  supports: {
    dueDate: boolean; reference: boolean; paymentTerms: boolean; notes: boolean;
    paymentDetails: boolean; tax: boolean; adjustments: boolean; logo: boolean;
  };
  options: {
    terminalAnchor: 'bottom' | 'flow';    // totals block pinned to the page bottom on the last page, or directly after the rows
    moneyDecimals: 'always' | 'auto';
    groupContinuationLabel: boolean;      // repeat the parent line ("… (continued)") when a group splits across pages
    keepLastRowsWithTerminal: number;     // when totals move to a new page, carry this many last rows with them
  };
}

export interface RowVM {
  id: string;
  kind: 'item' | 'child' | 'continued';
  pricing: 'explicit' | 'rollup' | 'none';  // of the owning item
  description: string;
  detail: string | null;
  qty: string | null;                     // already formatted; null => empty cell
  unit: string | null;
  rate: string | null;                    // formatted money or null
  amount: string | null;                  // formatted money or null
  isGroupParent: boolean;                 // item that has children
}
export interface RowGroupVM { id: string; rows: RowVM[] }   // rows[0] is the item row, then its children

export interface InvoiceVM {
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  paper: PaperSize;
  number: string;
  issueDate: string;                      // "15 Apr 2026"
  dueDate: string | null;
  reference: string | null;
  paymentTerms: string | null;
  currency: { code: string; symbol: string };
  issuer: { displayName: string; legalName: string | null; addressLines: string[]; email: string | null; phone: string | null; website: string | null; taxIds: { label: string; value: string }[]; logoUrl: string | null };
  client: { name: string; contactPerson: string | null; addressLines: string[]; email: string | null; phone: string | null; taxIds: { label: string; value: string }[] };
  groups: RowGroupVM[];
  hasQty: boolean;
  hasRate: boolean;
  adjustments: { label: string; amount: string; kind: 'discount' | 'charge' }[];   // amount signed, formatted
  subtotal: string;
  tax: { label: string; rate: string; amount: string } | null;
  total: string;
  notes: string | null;
  payment: { title: string; lines: { label: string; value: string }[] } | null;
}

export interface TemplateModule {
  manifest: TemplateManifest;
  /** Top of every page. 'first' carries the big title + meta strip; 'continuation' is a compact repeat (title, number, dates). */
  PageHeader: FC<{ vm: InvoiceVM; variant: 'first' | 'continuation' }>;
  /** First page only, below the header: parties (From / Bill to), reference, anything descriptive. */
  Intro: FC<{ vm: InvoiceVM }>;
  /** Column header row, repeated on every page that has rows. */
  TableHead: FC<{ vm: InvoiceVM; columns: ColumnSpec[] }>;
  /** One atomic row (never split across pages). */
  Row: FC<{ vm: InvoiceVM; row: RowVM; columns: ColumnSpec[]; isFirstOnPage: boolean; isLastOnPage: boolean; isLastInGroup: boolean }>;
  /** Atomic final block: notes, payment details, adjustments, tax, total. Arranged however the design wants. */
  Terminal: FC<{ vm: InvoiceVM }>;
  /** Bottom of every page; receives page numbers. Fixed height. */
  PageFooter: FC<{ vm: InvoiceVM; pageNumber: number; pageCount: number }>;
  /** Optional decoration layer (absolute positioned art, corner graphics). Must never affect layout. */
  PageDecoration?: FC<{ vm: InvoiceVM; pageNumber: number; pageCount: number; variant: 'first' | 'continuation' }>;
}
```

Also export from the package: `registry` (`getTemplate(id, version?)`, `listTemplates()`, latest-version resolution), `InvoiceDocument` (the renderer), `paginate`, `useInvoiceLayout`, and the fixtures.

### 8.3 Folder convention
```
packages/templates/
  src/
    contract.ts  registry.ts  paginate.ts  layout/  InvoiceDocument.tsx  MeasureLayer.tsx  fonts.ts
    templates/
      studio/               (Template 01, id: "studio")
        v1/
          index.tsx         exports default TemplateModule
          manifest.ts
          blocks/ (PageHeader.tsx, Intro.tsx, TableHead.tsx, Row.tsx, Terminal.tsx, PageFooter.tsx, PageDecoration.tsx)
          template.css      (all selectors prefixed .tpl-studio-v1)
          assets/           (SVG ornaments, etc.)
  fonts/<family>/*.woff2   fonts/LICENSES.md
  fixtures/                 scenario invoices for the template lab and screenshots
```
Adding a template = add a folder + one line in `registry.ts`. Nothing else in the app changes.

### 8.4 Geometry and CSS rules for templates (also enforced by the renderer)
- Page = `<div class="tpl-page" style="width:{w}mm;height:{h}mm">` with `padding` = manifest margins, `overflow:hidden`, `position:relative`, `break-after:page` (not after the last), `box-sizing:border-box`. Inside: header, intro (first page), table, spacer, terminal (last page), footer, in a flex column. Footer sits at the bottom of the content box.
- Template CSS is scoped under `.tpl-<id>-v<N>`; tokens from the manifest are applied as CSS custom properties on that root. Template CSS must not use app theme variables or Tailwind classes from the app. Plain CSS (or CSS variables + inline styles) only, using **mm/pt/px units**, never `vh`/`vw`/viewport units.
- Rows and head use CSS grid with `grid-template-columns: var(--tpl-cols)` (the renderer computes it from the visible columns) so every row aligns. **No `<table>` elements.** Rows must be `display:flow-root` with no collapsing margins: padding and borders only, so the measured height equals the rendered height.
- Amounts: `font-variant-numeric: tabular-nums`, right-aligned. Long text wraps (`overflow-wrap:anywhere`); never truncate content.
- Images (logo) must have explicit width/height or max-size so their height is known at measure time.
- Everything must print identically with `print-color-adjust: exact`. No animation, no hover styles, no `position:fixed`.
- Fonts must contain the glyphs the app prints: `₹ $ – · •`. A missing glyph falling back to another font is a bug.

### 8.5 Fonts
`packages/templates/fonts/<family>/` holds the files. `fonts.ts` builds `@font-face` rules from the active manifest's `fonts[]` using `import.meta.glob('../fonts/**/*.woff2', { query: '?url', import: 'default', eager: true })`, injects them, and exposes `loadTemplateFonts(manifest): Promise<void>` that awaits `document.fonts.load()` for every face then `document.fonts.ready`. Layout never runs before this resolves.
`pnpm fonts:add --family "Inter" --source fontsource [--weights 400,500,600,700] [--subsets latin,latin-ext]` fetches the matching `@fontsource` (or `@fontsource-variable`) package into a temp dir, copies the woff2 files (latin **and** latin-ext, because `₹` lives in latin-ext) plus the licence into `fonts/<family>/`, appends a row to `fonts/LICENSES.md`, and prints the `FontFaceDef[]` snippet to paste in a manifest. `--source file --zip <path> --license <id> --url <source-url>` imports fonts manually downloaded from Fontshare/Google (woff2/woff/ttf accepted; ttf is converted to woff2 if a converter is available, otherwise kept). Warn when the licence isn't OFL-1.1 or Apache-2.0.
Template 01 uses **Inter** (variable weight if available, else 400/500/600/700 static).

### 8.6 Measurement and pagination

**Measure (browser).** `MeasureLayer` renders, off-screen at the exact content width (`pageWidth − margins`), inside a `.tpl-<id>-v<N>` root with the same CSS, every block once: header-first, header-continuation, intro, table head, every row, a 'continued' row per group (if enabled), terminal, footer. Each is wrapped in a `display:flow-root` element; heights come from `getBoundingClientRect().height`, rounded **up** to 0.25px. Run only after `loadTemplateFonts` resolves; re-run on content change (debounce ~60 ms), on paper/template change, and when fonts finish loading. The previous plan stays on screen until the new one is ready (no flicker).

**Paginate (pure function, `paginate.ts`).**
```ts
interface Unit { id: string; groupId: string; height: number; kind: 'item'|'child'; isFirstInGroup: boolean }
interface PaginateInput {
  contentHeight: number;                   // page height − top/bottom margins (px)
  footerHeight: number;                    // reserved on every page
  headerHeight: { first: number; continuation: number };
  introHeight: number;                     // first page only
  tableHeadHeight: number;                 // on every page that has rows
  units: Unit[];                           // in order; an item with children contributes [item+firstChild merged as ONE unit, then each further child]
  continuedHeight: Record<string, number>; // per groupId, 0 if the option is off
  terminalHeight: number;
  options: { keepLastRowsWithTerminal: number; safety: number /* px, default 1 */ };
}
interface PagePlan { pageNumber: number; variant: 'first'|'continuation'; unitIds: string[]; continuedGroupId: string | null; hasTerminal: boolean }
function paginate(input: PaginateInput): PagePlan[]
```
Algorithm:
1. Page 1 body capacity = `contentHeight − footerHeight − header.first − intro − tableHead`. Later pages: `contentHeight − footerHeight − header.continuation − tableHead`. Subtract `safety`.
2. Fill greedily: place the next unit if `used + height ≤ capacity`; otherwise start a new page. When a page begins with a non-first unit of a group and the option is on, reserve `continuedHeight[groupId]` for the repeated parent line.
3. An item with children is merged with its **first child** into one atomic unit (never orphan the parent line from its first child). Further children are separate units, so a long group can legitimately flow across pages.
4. After the last unit: if `terminalHeight ≤ remaining capacity` → terminal goes on this page. Otherwise move the last `keepLastRowsWithTerminal` units (never all units of the invoice if that would leave the previous page empty) to a new final page together with the terminal, so totals never sit alone.
5. If a single unit is taller than an entire empty page body, or the terminal alone is taller than a whole page body, throw `PaginationError` with a clear message; the preview shows a banner instead of crashing. Form-level limits (§4.2) make this unreachable in practice.
6. Deterministic: same input, same output. No DOM access.

**Render.** `<InvoiceDocument vm template paperSize onLayout>` composes pages from the plan: `PageDecoration` (absolute, behind), `PageHeader(variant)`, `Intro` (page 1), `TableHead` + `Row`s, flex spacer, `Terminal` on the last page (pinned to the bottom if `terminalAnchor:'bottom'`, else right after the rows), `PageFooter`. It sets `data-page-count`, and calls `window.__INVOICE_READY__ = true` once fonts are loaded and the plan is committed. Dev-mode assertion: after layout, every page's content `scrollHeight` must be ≤ its `clientHeight`; otherwise log a clear error and show a dev badge.

### 8.7 Hooks and components
- `useInvoiceLayout(vm, templateModule, paperSize)` → `{ plan, status:'measuring'|'ready'|'error', error }`.
- `<InvoicePreview>` (web): hosts `<InvoiceDocument>`, handles zoom/scroll (see §10.3).
- Template lab route (dev only) `/dev/templates/:id`: renders a template against every fixture scenario with controls for paper, version and a "show page boxes / margins / measured heights" overlay.

### 8.8 Fixtures (`packages/templates/fixtures/`)
Typed `InvoiceDoc` scenarios used by tests, the template lab, screenshots and the template-design prompt: `minimal-1-item`, `typical-5-items`, `with-notes-and-payment`, `nested-priced-rollup`, `nested-descriptive-explicit`, `nested-mixed-priced-unpriced`, `flat-no-qty`, `long-descriptions`, `forty-items-multipage`, `big-group-spanning-pages`, `tax-and-adjustments`, `usd-letter`, `no-due-date-no-reference`, `terminal-just-overflows-page`, `max-length-fields`. The same fixtures feed the seed where useful.

### 8.9 Template 01 — "Studio" (id `studio`, version 1) design brief
Best-practice invoice structure, restrained and typographic, with designer polish. Not a copy of the reference image.
- **Font**: Inter. Numerals tabular. Weights 400/500/600/700. Body 9pt/1.45, labels 7pt uppercase tracked +0.08em, title 30pt weight 700 tight tracking.
- **Colour tokens**: ink `#111111`, text `#2B2B2B`, muted `#6B6B6B`, hairline `#D9D9D9`, tint `#F3F3F1`, one accent `#1F3DFF` used sparingly (accent bar, total rule, small markers). White paper.
- **Margins** (A4 and Letter): 16 mm left/right, 16 mm top, 14 mm bottom.
- **PageHeader `first`**: left, logo if present (max 42×14 mm, template-controlled) otherwise the issuer display name as a wordmark in 600 weight; right or below, a large `INVOICE` title. A short accent bar (24×1.2 mm) above the title and a thin full-width hairline below. Then the **meta strip**: a tinted band of cells — Invoice No., Issue date, Due date, and Reference (cells with no value are omitted and the rest re-flow; never print a placeholder like `------`).
- **PageHeader `continuation`**: compact single row: small `INVOICE`, the number, issue date, and client name; hairline below.
- **Intro**: two columns, `FROM` (issuer: name, legal name, address lines, email, phone, tax IDs) and `BILL TO` (client: name, contact person, address, email, phone, tax IDs). Labels in the small-caps style. Tax IDs print as `GSTIN  29XXXXX` style lines using the stored label.
- **Table**: head row = small-caps labels over a 0.4 mm ink rule; rows separated by hairlines; row padding 3.2 mm vertical. Columns: Description (1fr), Qty (24mm, shows `12 hrs` when a unit exists, empty when no qty), Rate (30mm), Amount (34mm), with `qty` and `rate` hidden when no row uses them. Item description weight 500, optional `detail` line muted below. **Children**: indented 6 mm, muted colour, 8.5pt, with a 0.3 mm vertical hairline in the gutter acting as a tree line; child amounts muted. For a group parent in `rollup`/`none` mode the parent row is weight 600 and children follow without separating hairlines between them (hairline only after the last child). The `continued` row shows the parent description in muted style with "(continued)".
- **Terminal** (atomic, anchored to the page bottom on the final page): two columns. Left: **Payment details** (label/value list, labels muted, values medium weight) then **Notes** below it, each only if present. Right: totals block — Subtotal, each adjustment (discounts show negative with a minus), Tax (`GST 18%`, using the label), a 0.5 mm accent rule, then **Total** at 13pt weight 700 with the currency symbol. Payment terms text sits under the totals in muted small text when present.
- **PageFooter**: hairline; left `issuer name · email · phone` (muted 7.5pt); right `Page X of Y`.
- **PageDecoration**: a very light geometric accent: an 18×18 mm quarter-circle outline in the top-right corner of the first page (stroke accent at 12% opacity) and nothing else. No impact on layout.
- Must support every `supports` flag as true and render correctly for every fixture on both A4 and Letter.

---

## 9. PDF export
- `GET /api/invoices/:id/pdf` (server): if `issue=true` and the invoice is DRAFT, issue it first (revision 1 snapshot, activity log). Then launch (reuse a warm browser instance, one page per request, closed on server shutdown), open `http://127.0.0.1:{PORT}/print/{id}?token={signed}` where the token is an HMAC (PRINT_SECRET) valid ~60 s and bound to the invoice id and revision. `/print/:id` renders **only** `<InvoiceDocument>` (no app chrome, white background, zero margins) using the same API data path, then sets `window.__INVOICE_READY__`.
- Puppeteer: `await page.waitForFunction('window.__INVOICE_READY__ === true')`, then `page.pdf({ preferCSSPageSize: true, printBackground: true, margin: {top:0,right:0,bottom:0,left:0} })`. The print CSS sets `@page { size: <w>mm <h>mm; margin: 0 }` per paper size.
- Filename: `INV-2026-0004 - <Client name>.pdf` (sanitized).
- `PUPPETEER_EXECUTABLE_PATH` override supported; startup logs a clear message if Chromium is missing.
- No headerTemplate/footerTemplate use: page numbers come from the paginated DOM.
- Dev-only `/print/fixture/:scenario?template=…&version=…&paper=…` (no auth, disabled in production) used by `pnpm template:shots`.

---

## 10. Web app

### 10.1 Routes
`/login` · `/` Dashboard · `/invoices` (tabs **By date**, **By client**, **Trash**) · `/invoices/new` · `/invoices/:id` editor · `/invoices/:id/history` · `/clients` · `/clients/:id` (client "folder") · `/activity` · `/settings/:tab` (`business`, `profiles`, `payment-accounts`, `numbering`, `templates`, `account`, `data`) · `/print/:id` · dev: `/dev/templates/:id`.
App shell: collapsible sidebar (Dashboard, Invoices, Clients, Activity, Settings), top bar with workspace name, search command palette (Cmd/Ctrl+K: jump to invoice number or client), user menu.

### 10.2 Dashboard
Per-currency stat cards (never add INR and USD together): Outstanding, Overdue (amount + count), Paid this month, Paid this year (calendar year, or FY if numbering period is financial), Drafts count. **Aging** table: Not yet due / 1–30 / 31–60 / 61+ days overdue, with per-client rows. Top clients by outstanding. Recent invoices list. "New invoice" primary button.

### 10.3 Invoices list
- **By date**: table grouped by month headers (Issue date desc). Columns: Number, Client, Issue date, Due date, Issuer profile, Status badge (Overdue shown as a red badge on ISSUED), Total. Search (number/client/reference), filters: status (incl. Overdue), client, **issuer profile** (also a "group by profile" toggle), date range, currency. Row click opens the editor; row menu: Duplicate, Mark paid, Cancel, Download PDF, Discard.
- **By client**: grid of client folder cards (name, invoice count, outstanding per currency, last invoice date). Click opens `/clients/:id` showing client details, summary (billed / paid / outstanding), and its invoices table with the same filters. "New invoice for this client" button.
- **Trash**: discarded drafts with Restore.
- All list state in the URL query string.

### 10.4 Editor (`/invoices/:id`)
- `ResizablePanelGroup`: left form panel, right preview panel, draggable handle; sizes persisted in localStorage; collapsible form. Below 1024 px: tabs "Edit | Preview".
- **Header bar**: back, number + status badge, saved-state indicator ("Saved 12:04", "Saving…", "Unsaved changes"), actions: Export PDF (primary; DRAFT shows the issue-or-not dialog), Mark as issued, Mark paid, Cancel, Duplicate, History, ⋯.
- **Form** (accordion sections, React Hook Form + zod from `@workspace/shared`; every change updates a Zustand `draftDoc` that feeds `calculate` → VM → preview with no network round trip):
  1. *Document*: template (gallery select with thumbnails), paper size (A4/Letter), currency (INR/USD dropdown), invoice number (shows generated; "Edit number" with uniqueness check), issue date, due date (quick buttons: on receipt, 7, 15, 30 days), reference, payment terms.
  2. *From*: issuer profile select, with logo preview; editable snapshot fields.
  3. *Bill to*: client select/search with "New client" inline sheet; editable snapshot; "Refresh from client".
  4. *Items*: sortable list (dnd-kit). Each item card: description, optional detail, pricing segmented control **Fixed amount / Breakdown of charges / Description only**. Fixed: qty (optional, placeholder "—"), unit, rate; computed amount shown read-only. Breakdown/Description: "Add breakdown line" with one level of children; in *Breakdown of charges* each child has optional qty, unit, optional rate and computed amount; in *Fixed* and *Description only* children have only description. Live row total, reorder, duplicate, delete.
  5. *Adjustments*: discounts/charges (fixed or percent). *Tax*: toggle, label, rate.
  6. *Notes*: toggle + textarea (800 chars max, counter). *Payment details*: toggle + payment account select (defaults per client/profile), preview of the lines.
  Sections the chosen template does not support are disabled with an explanatory hint.
- **Autosave**: DRAFT autosaves 800 ms after the last change (optimistic, with error toast and retry). ISSUED invoices show **Save changes** (disabled until dirty) with an optional change note dialog; leaving with unsaved changes prompts. PAID/CANCELLED open read-only with a banner and the relevant action (Reopen / Duplicate). Cmd/Ctrl+S saves.
- **Preview panel**: toolbar with zoom out/in, a zoom % select (25–300), **Fit width**, **Fit page**, 100%, and a page indicator ("Page 2 of 4", updates on scroll via IntersectionObserver, click to jump). Ctrl/Cmd+wheel and pinch zoom; plain scroll moves through pages; middle/space-drag pan optional. Pages are stacked with a 16 px gap on a neutral grey canvas with soft page shadows. Zoom is a CSS transform on a wrapper sized to the scaled content so layout/pagination never changes with zoom. Layout runs once at 100% geometry. Show a subtle "Updating…" indicator while measuring and an error banner on `PaginationError`.

### 10.5 Settings
- *Business*: name, timezone, default currency, default paper size, default template, default due days, default payment terms, default notes.
- *Issuer profiles*: list/add/edit/archive, logo upload with crop-free preview, default flag, default payment account. (Personal name vs company name live here.)
- *Payment accounts*: ordered label/value lines editor, currency, linked profile, presets for "Indian bank (INR)", "UPI", "International (USD)".
- *Numbering*: prefix, separator, period (None / Calendar year / Financial year + start month), padding, start number, reset each period; live example of the next number.
- *Templates*: read-only gallery of installed templates with thumbnail (a generated PNG per template/version, produced by `pnpm template:shots`), description, fonts and licences.
- *Account*: change password.
- *Data*: **Export all data** (backup ZIP/JSON), database file location note.

### 10.6 UX quality
Dense but calm. Real empty states, skeletons, toasts (Sonner), keyboard-friendly forms, inline validation messages, confirm dialogs for destructive/state-changing actions. Light mode by default, honour the shadcn preset's dark mode if it provides one (the *preview* paper is always white).

---

## 11. Seed data (`pnpm db:seed`, idempotent; refuses to run if data exists unless `--force`)
Fictional but realistic freelance UI/UX and software studio. Dates are generated relative to *today* so "overdue" and aging are always meaningful.
- User `demo` / `demo1234`, workspace "Menon Design Studio" (timezone Asia/Kolkata, default currency INR, numbering `INV-{year}-{0000}`).
- **Issuer profiles (2)**: "Aarav Menon" (personal freelance; PAN-style tax ID) and "Menon Design Co." (company; GSTIN-style tax ID shown as plain info); logos: generate two simple SVG/PNG marks into `data/uploads` (invented, not real brands).
- **Payment accounts (3)**: personal savings (INR bank lines + UPI), company current (INR bank lines), company USD international (SWIFT etc.). Obviously fake numbers.
- **Clients (6)**: Kaveri Automation Pvt Ltd (Bengaluru), Tarang Industrial Controls (Pune), Orbit Machine Works (Coimbatore), Nilgiri Tea Machinery (Coonoor), Vantage Sensors Pvt Ltd (Hyderabad), Holloway Robotics Inc. (Austin, USD). Each with address lines, email, phone, tax IDs on some, default profile/account.
- **Invoices (14)** covering: a one-page invoice (2 items); a three-page invoice with 40+ items and some long descriptions; nested breakdown items in all three pricing modes including `rollup` with a mix of priced and unpriced children and children **without quantity** (flat fees) and some **with** quantity (e.g. 12 hrs); an invoice with notes + payment details + tax 18%; one with a discount and an extra charge; one USD invoice on Letter paper; one DRAFT; two ISSUED not yet due; two ISSUED overdue (one 20 days, one 75 days); three PAID (different months); one CANCELLED; one ISSUED with 3 revisions (with change notes); a discarded draft in Trash. Statuses and numbers must be consistent (no number gaps except the discarded draft and cancelled invoice, which keep their numbers). Activity log entries for the above.
- Realistic work items: HMI dashboard UI design, design system, frontend/React build, API integration, QA, brand refresh, monthly retainer, workshop.

---

## 12. Testing
- **Vitest (shared)**: money formatting/parsing (Indian + Western grouping, rounding half-up), qty/rate/amount with and without qty, every pricing mode, no double counting, adjustments (percent vs fixed, ordering), tax, totals, validation rules (child qty without rate, explicit without rate, depth), numbering (formats, padding overflow at 10000, reset by period, FY boundary 31 Mar/1 Apr, skip-taken, never reuse, manual override advancing the sequence), lifecycle transition table, overdue and aging buckets.
- **Vitest (templates)**: `paginate()` with synthetic heights: exactly-fits boundary, one px over, parent+first-child atomicity, group split with continued label, terminal fits / terminal moves with `keepLastRows`, terminal-only-page prevention, oversize unit error, determinism, 1-item and 200-item invoices, different first vs continuation header heights.
- **Vitest (server)**: repositories enforce `workspaceId`; auth (hash, session expiry, rate limit); route authorization; transition conflicts (editing PAID returns 409); concurrent number allocation yields unique numbers.
- **Playwright**: login; create invoice from a client; edit items and see preview update; add 40 items and see ≥ 3 pages; zoom controls; **PDF page count equals preview page count** for the fixtures `typical-5-items`, `forty-items-multipage`, `big-group-spanning-pages`, `terminal-just-overflows-page` on both A4 and Letter (read the PDF with `pdf-lib`); no page overflows; issue → edit creates a revision; paid becomes read-only; dashboard totals match seed data; `₹` glyph present (check that the template font is the one used, not a fallback).
- Template screenshots: `pnpm template:shots <id> [--version N] [--thumb]` renders every fixture × {A4, Letter} via the dev print route into `.template-shots/<id>/v<N>/<scenario>-<paper>-p<k>.png`, for visual review. With `--thumb` it also writes the template's gallery thumbnail (first page of `typical-5-items`, A4) to `packages/templates/src/templates/<id>/v<N>/assets/thumbnail.png`, which the Settings → Templates gallery and the editor's template picker display.
- **Template conformance suite** (Playwright, runs for every registered template/version, so new templates are checked automatically): renders every fixture on A4 and Letter and fails on page overflow, on the `₹`/`$` glyphs falling back to a non-template font, on a `supports` flag set true while its field isn't rendered, on a `<table>` element, on non-scoped CSS selectors, and on any fixture producing a `PaginationError`.

---

## 13. Phases (commit after each; each must pass typecheck, lint, tests)

**Phase 0 — Scaffold.** Run the shadcn init command. Add `apps/server`, `packages/shared`, `packages/templates`. Root scripts, ESLint/Prettier/Vitest/TS paths, `.env.example`, `.gitignore` (data/, .template-shots/), docs files (`DECISIONS.md`, `POSSIBLE_ADDITIONS.md` seeded from section 14). Verify `pnpm dev` starts web + server with a health endpoint.

**Phase 1 — Shared domain.** Money/currencies, zod schemas, calculation, view-model builder, numbering, lifecycle, formatters, with the full Vitest suite from §12. *Done when:* all domain tests pass and `calculate` matches hand-checked examples.

**Phase 2 — Server foundation.** Drizzle schema + migrations, repositories (workspace-scoped), auth + sessions + CLI user creation, API for workspace, profiles (+ logo upload), payment accounts, clients, invoices (create/update/transition/revisions/duplicate/discard/restore), activity log, dashboard aggregates, backup export. Server tests. *Done when:* the API passes its tests and a curl walkthrough (login → create client → create invoice → issue → edit → revisions → pay) works.

**Phase 3 — Template system.** Contract, registry, fonts pipeline (`fonts:add`; install Inter with latin + latin-ext), paginator + tests, `MeasureLayer`, `useInvoiceLayout`, `InvoiceDocument`, fixtures, **Template 01 "Studio" v1** per §8.9, template lab route, `template:shots`. Generate `docs/TEMPLATE_CONTRACT.md`. *Done when:* every fixture renders on A4 and Letter with no overflow, screenshots look right on inspection (view them), and the 40-item fixture paginates to multiple pages with repeated header + table head and a properly anchored terminal.

**Phase 4 — Web shell and master data.** Auth pages and guard, app shell, TanStack Query setup, settings pages (business, profiles with logo upload, payment accounts, numbering with live preview, templates gallery, account, data export), clients CRUD. *Done when:* a user can log in and configure everything needed to invoice.

**Phase 5 — Editor.** Split screen, form sections, Zustand draft store → calculate → VM → preview, zoom/scroll/page indicator, autosave, issue/pay/cancel/reopen flows, revisions + history page, duplicate. *Done when:* the end-to-end flow works and preview updates feel instant.

**Phase 6 — Lists, dashboard, activity.** Invoices by date/by client/trash, client folder page, filters in URL, dashboard with aging, command palette, activity page. 

**Phase 7 — PDF.** Print route, token, Puppeteer service, export flow in the editor and lists, filename, Playwright parity tests (§12), fix any pagination mismatch at the root (do not paper over it).

**Phase 8 — Seed, polish, docs.** Seed per §11, empty/error/loading states, accessibility pass (labels, focus, contrast), README (install, `pnpm dev`, create user, seed, build/start, deploying to a LAN box, backup/restore, how to add a template and a font, pointing at `TEMPLATE_DESIGN_PROMPT.md`), final full test run, screenshot sweep of the app's key screens for visual QA.

At the end print a short report: what exists, commands to run, the demo login, known limitations, and the list of entries in `docs/DECISIONS.md`.

All scripts and paths must work on both Windows and Linux (use cross-env, rimraf, path.join, and a .gitattributes forcing LF line endings).

---

## 14. Deferred — do NOT build; record in `docs/POSSIBLE_ADDITIONS.md`
GST mode (CGST/SGST/IGST, HSN/SAC, place of supply, reverse charge, GST numbering rules, e-invoicing/IRN, QR) · other document types (quotes, estimates, credit/debit notes, receipts; the `type` field is reserved) · partial payments and payment records · per-line discounts and per-line tax · email sending from the app · recurring invoices · reports (revenue by month/client/profile, CSV export) · kanban status board · calendar view · more currencies (AED, GBP, …) · multi-workspace switching per login and in-app user/admin screens · user-created templates / visual template editor · client portal / share links · multi-language invoices · attachments · signature image block · reminders · import from CSV.

## 15. Definition of done
Everything in §13 complete; `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` green; fresh clone → `pnpm install` → `pnpm db:reset && pnpm db:seed` → `pnpm dev` → log in as `demo` → open the 3-page seeded invoice → preview shows 3 pages with repeated headers → Export PDF yields a 3-page PDF visually identical to the preview. Template 01 looks designed and polished on both paper sizes.

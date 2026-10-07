# Architecture

## Layers (never leak)

`InvoiceDoc` (semantic, stored as JSON) → `calculate()` → `CalculatedInvoice` → `buildInvoiceVM()` → `InvoiceVM` (formatted strings) → template components → `paginate()` over measured heights → `<InvoiceDocument>` (fixed-size page divs) → preview **and** PDF.

- `packages/shared`: `schema.ts` (zod; strict `invoiceDocSchema` for issuing, lenient `invoiceDraftSchema` for autosave), `calculate.ts`, `vm.ts`, `money.ts`/`format.ts` (big.js, Indian grouping), `numbering.ts`, `lifecycle.ts` (transitions, overdue, aging), `docOps.ts` (pure editor helpers), `dto.ts` (API shapes shared with the web app), `master.ts`/`workspace.ts` (input schemas).
- `packages/templates`: `contract.ts` (mirrors `docs/TEMPLATE_CONTRACT.md`), `paginate.ts` (pure), `layout/` (columns, units, measure, plan, `useInvoiceLayout`), `InvoiceDocument.tsx`, `fonts.ts`, `registry.ts`, `fixtures/` (15 scenarios), `templates/studio/v1`.
- `apps/server`: routes are thin; `services/invoices.ts` holds create/save/issue/pay/reopen/cancel/duplicate/discard/restore (all in transactions, numbering inside `BEGIN IMMEDIATE`); repos always take a workspace id; `services/stats.ts` (dashboard, client summaries); `services/pdf.ts` + `printToken.ts` (PDF); `seed/` (demo data through the real services with a controllable clock).
- `apps/web`: TanStack Query for server state (`lib/queries.ts`, `lib/invoiceQueries.ts`); Zustand for the editor draft (`features/editor/editorStore.ts`) and preview zoom (`previewStore.ts`); settings and client forms use React Hook Form + `payloadResolver` (shared zod schemas); the editor itself uses controlled inputs on the store.

## Key flows

- **Editor**: store `doc` → `useInvoiceVm` (memoised on doc) → `PreviewPanel` → `InvoiceDocument` → `useInvoiceLayout` measures off-screen, paginates, renders pages; the last good layout stays visible while re-measuring. DRAFT autosaves 800 ms after the last edit; ISSUED needs "Save changes" (new revision).
- **PDF**: `GET /api/invoices/:id/pdf?issue=` → optional issue → HMAC print token (60 s, bound to workspace + invoice) → headless browser opens `/print/:id?token=` → the page fetches `/api/print/:id`, renders the same `InvoiceDocument`, sets `window.__INVOICE_READY__` → `page.pdf()`.
- **Numbers**: allocated at creation from `number_sequences` (period key from the issue date), skipping any taken number (including soft-deleted and cancelled); manual numbers advance the sequence when they match the pattern.
- **Auth**: argon2id, session cookie `sid` (sha256 stored), 30-day sliding; origin check on mutating requests; login rate limit in memory.

## Where to change what

- New money or maths rule → `packages/shared` + tests. New field on the invoice → `schema.ts`, `vm.ts`, template blocks, editor section, and `docs/TEMPLATE_CONTRACT.md` if templates see it.
- New template → see README "Adding a template". New font → `pnpm fonts:add`.
- New API endpoint → route + service + test in `apps/server/src`, DTO in `packages/shared/src/dto.ts`.

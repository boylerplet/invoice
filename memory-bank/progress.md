# Progress

Update this file at the end of every work chunk. Newest status first.

## Current phase
Phase 8 — Seed, polish, docs (next)

## Phase checklist
- [x] 0 Scaffold
- [x] 1 Shared domain
- [x] 2 Server foundation
- [x] 3 Template system
- [x] 4 Web shell and master data
- [x] 5 Editor
- [x] 6 Lists, dashboard, activity
- [x] 7 PDF
- [ ] 8 Seed, polish, docs

## Log
- Toolchain verified: Node 24, pnpm 12.9.1, git. shadcn monorepo scaffolded (see docs/DECISIONS.md).
- Phase 1 done: `packages/shared` has money/format/dates/schema/calculate/vm/numbering/lifecycle with 52 tests. InvoiceVM types live in shared (`vm.ts`) because templates depends on shared; templates' contract re-exports them. Row rate/amount strings have no currency symbol; only `vm.total` has it.
- Phase 2 done: Hono API (auth, workspace, profiles+logo, payment accounts, clients, invoices+transitions+revisions, dashboard, activity, backup) with 35 server tests and a verified curl walkthrough. PDF route and /print data endpoint are NOT built yet (Phase 7). Seed is Phase 8. Server code map: `apps/server/src/{routes,services,repos,auth,db,cli}`; test helpers in `src/test-utils.ts`.
- Phase 3 done: `packages/templates` has contract, paginator (21 tests), fonts pipeline (`pnpm fonts:add`, Inter installed), measure/plan/hook, `<InvoiceDocument>`, 15 fixtures, Template 01 "Studio" v1, `docs/TEMPLATE_CONTRACT.md`, `pnpm template:shots`, and a Playwright conformance suite (`pnpm exec playwright test conformance`; needs the dev server, starts it automatically). Web app currently only has dev routes (lab, fixture print, registry dump); the real app shell starts in Phase 4. Screenshots reviewed by eye: A4/Letter fixtures look right.
- Phase 4 done: login + guard, app shell (shadcn sidebar), settings (business, issuer profiles + logo upload, payment accounts w/ presets, numbering w/ live preview, templates gallery, account, data export), clients list + create/edit/archive. Dashboard/Invoices/Activity/Client detail routes are placeholders (`Later` in router.tsx) until Phase 5/6. Forms: RHF + `payloadResolver` (validates with the shared zod schemas after converting form values to the API payload). E2E: `pnpm exec playwright test` (isolated server on 5174/3002 via `pnpm e2e:server`). QA screenshots: `MSYS_NO_PATHCONV=1 pnpm tsx scripts/qa-shots.ts /route ...` (needs `pnpm dev` + demo user). Kill stale servers with PowerShell `Get-Process node | Stop-Process -Force` if ports stick.
- Phase 5 done: editor at `/invoices/:id` (resizable split, accordion form with dnd-kit items, autosave, issue/pay/cancel/reopen/duplicate/discard flows, revisions + `/invoices/:id/history`, preview zoom/fit/page indicator), `/invoices/new`. Status/pay/cancel dialogs live in `features/invoices/InvoiceDialogs.tsx` and mutation hooks in `lib/invoiceQueries.ts` (reuse them in the Phase 6 lists). E2E: `e2e/editor.spec.ts` (7 tests green). PDF export button is NOT in the editor yet (Phase 7). `/invoices` (list), `/` (dashboard), `/activity`, `/clients/:id` are still `Later` placeholders in `router.tsx`.
- Phase 6 done: `/invoices` (By date with month groups / By client folders / Trash, URL-state filters, row actions), `/clients/:id` folder page, dashboard (per-currency cards, aging, top clients, recent), `/activity` (infinite), Ctrl+K palette. E2E: `e2e/lists.spec.ts` (uses a second user `lists` created via CLI for isolation). Row menu has NO "Download PDF" yet (Phase 7).
- Phase 7 done: `/print/:id` (token), `GET /api/invoices/:id/pdf?issue=`, warm puppeteer-core browser, editor "Export PDF" (+ issue/no-issue dialog), list "Download PDF". Parity e2e (`e2e/pdf.spec.ts`) green for 4 fixtures × A4/Letter. Full suite: 32 Playwright tests green (`pnpm exec playwright test`, ~2.5 min), 156 unit tests.

# Progress

Update this file at the end of every work chunk. Newest status first.

## Current phase
Phase 4 — Web shell and master data (next)

## Phase checklist
- [x] 0 Scaffold
- [x] 1 Shared domain
- [x] 2 Server foundation
- [x] 3 Template system
- [ ] 4 Web shell and master data
- [ ] 5 Editor
- [ ] 6 Lists, dashboard, activity
- [ ] 7 PDF
- [ ] 8 Seed, polish, docs

## Log
- Toolchain verified: Node 24, pnpm 12.9.1, git. shadcn monorepo scaffolded (see docs/DECISIONS.md).
- Phase 1 done: `packages/shared` has money/format/dates/schema/calculate/vm/numbering/lifecycle with 52 tests. InvoiceVM types live in shared (`vm.ts`) because templates depends on shared; templates' contract re-exports them. Row rate/amount strings have no currency symbol; only `vm.total` has it.
- Phase 2 done: Hono API (auth, workspace, profiles+logo, payment accounts, clients, invoices+transitions+revisions, dashboard, activity, backup) with 35 server tests and a verified curl walkthrough. PDF route and /print data endpoint are NOT built yet (Phase 7). Seed is Phase 8. Server code map: `apps/server/src/{routes,services,repos,auth,db,cli}`; test helpers in `src/test-utils.ts`.
- Phase 3 done: `packages/templates` has contract, paginator (21 tests), fonts pipeline (`pnpm fonts:add`, Inter installed), measure/plan/hook, `<InvoiceDocument>`, 15 fixtures, Template 01 "Studio" v1, `docs/TEMPLATE_CONTRACT.md`, `pnpm template:shots`, and a Playwright conformance suite (`pnpm exec playwright test conformance`; needs the dev server, starts it automatically). Web app currently only has dev routes (lab, fixture print, registry dump); the real app shell starts in Phase 4. Screenshots reviewed by eye: A4/Letter fixtures look right.

# Progress

Update this file at the end of every work chunk. Newest status first.

## Current status

**All 9 build phases (0 to 8) are complete and committed.** The app is feature complete for v0.0.1 per `docs/BUILD_PROMPT.md`. Remaining work is optional polish (see `next-steps.md`).

## Phase checklist

- [x] 0 Scaffold
- [x] 1 Shared domain
- [x] 2 Server foundation
- [x] 3 Template system
- [x] 4 Web shell and master data
- [x] 5 Editor
- [x] 6 Lists, dashboard, activity
- [x] 7 PDF
- [x] 8 Seed, polish, docs

## What exists

- Login, app shell, settings (business, issuer profiles + logos, payment accounts, numbering with live preview, templates gallery, account, data export), clients, client folder pages.
- Invoice editor with split screen, autosave, issue/pay/cancel/reopen/duplicate/discard, revisions and history, zoom/fit/page indicator, PDF export.
- Lists by date / by client / trash with URL-state filters, dashboard with aging and per-currency totals, activity log, Ctrl+K palette.
- Template system with one template ("Studio" v1), 15 fixtures, conformance suite, font pipeline, screenshot tooling.
- Demo seed (`pnpm db:seed`, user `demo` / `demo1234`), README, production build and server verified (including PDF in production mode).

## Verification at the end of Phase 8

- `pnpm typecheck`, `pnpm lint`, `pnpm test` green (shared 58, templates 53, server 49).
- `pnpm test:e2e`: 38 Playwright tests green (conformance, master data, editor, lists, PDF parity, seed, accessibility).
- `pnpm build` then `pnpm start` serves the SPA and API; PDF export works in production mode.

## Log

- Phase 0: toolchain verified (Node 24, pnpm 12.9.1, git). shadcn init failed on a corrupt npm cache; scaffold moved into the repo, converted to pnpm, preset re-applied with `shadcn apply`.
- Phase 1: shared domain (money, calculation, view model, numbering, lifecycle, zod schemas). InvoiceVM types live in `@workspace/shared` and the templates contract re-exports them.
- Phase 2: Hono API with auth, master data, invoices, revisions, dashboard, backup; curl walkthrough verified.
- Phase 3: template contract, paginator, renderer, fonts, fixtures, Template 01 reviewed by eye on A4 and Letter.
- Phase 4: web shell and settings. Phase 5: editor. Phase 6: lists, dashboard, activity. Phase 7: PDF with parity tests.
- Phase 8: seed with 14 invoices, accessibility fixes found by axe (accessible names on selects, focusable scroll region, `main` landmark, skip link), route error page, README and memory-bank docs, Prettier run over the code base. **Found and fixed**: the web `typecheck` script had been a no-op (root tsconfig only has references); it now runs `tsc -p tsconfig.app.json`, and the three real errors it revealed were fixed.

## Known limitations

See README "Known limitations" and `docs/POSSIBLE_ADDITIONS.md`. Notable: one template; INR and USD only; no GST machinery; backups are a ZIP/JSON export plus copying `data/`.

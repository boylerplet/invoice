# Testing and QA

## Gates (must be green before each commit)

`pnpm typecheck && pnpm lint && pnpm test`. Unit counts at the end of Phase 8: shared 58, templates 53, server 49.

## Playwright (`pnpm test:e2e`, about 4 minutes, 38 tests)

- The config starts an isolated server (`pnpm e2e:server`): `DATA_DIR=./.e2e-data`, API 3002, web 5174, database reset and `db:seed` per run. It never reuses an existing server (stop stray node processes first).
- Specs: `conformance` (every registered template × fixtures × A4/Letter: overflow, `<table>`, scoped CSS, glyphs, `supports` flags), `master-data`, `editor`, `lists` (uses a separate `lists` user created by CLI for exact dashboard numbers), `pdf` (page count, page size and per-page text parity between preview and PDF for 4 fixtures × A4/Letter, plus export flows), `seed` (dashboard = API, the 3-page seeded invoice exports 3 pages), `a11y` (axe, serious/critical WCAG A/AA).
- Locator notes: `Button render={<Link/>}` renders an `<a>` without a link role, so find it by text or href; Base UI selects are `role=combobox` triggers (use ids such as `#filter-status`, `#zoom-select`); preview content is under `data-testid="preview-pages"`.

## Manual and visual QA scripts (need a running server and the `demo` user)

- `pnpm template:shots studio --thumb`: PNGs of every fixture × paper in `.template-shots/`.
- `MSYS_NO_PATHCONV=1 pnpm tsx scripts/qa-shots.ts / /invoices …`: logged-in screenshots in `.qa-shots/` (`QA_BASE` points it elsewhere).
- `pnpm tsx scripts/qa-editor.ts`, `scripts/qa-pdf.ts <scenario> [A4|LETTER]`, `scripts/pdf-to-png.ts <file.pdf>`: create data, export a PDF, render it to PNG to look at it.

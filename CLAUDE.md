# CLAUDE.md — Invoice Studio

Persistent project rules. Read at the start of every session. The full spec is `docs/BUILD_PROMPT.md`; this file is the short list of rules that must never be broken.

## What this is
A local-first, single-business service-invoice app for designers and freelancers. Split-screen editor (form left, paginated live preview right), professionally designed templates, server-side PDF export, invoice lists by date and by client, a dashboard. One login = one workspace (one business). Built to be moved to a LAN/server later.

## Stack (fixed)
pnpm monorepo (created by `shadcn init --monorepo`) · Vite + React + TypeScript · Tailwind + shadcn/ui · React Router · TanStack Query · Zustand · React Hook Form + Zod · Hono (Node) · SQLite via better-sqlite3 + Drizzle · @node-rs/argon2 · Puppeteer · big.js · Vitest · Playwright · Fontsource (open-source fonts only).

Workspace packages use the scope shadcn generates (assume `@workspace/*`; if it differs, use what it generated): `@workspace/ui` (shadcn), `@workspace/shared` (domain: types, zod, money, calculation, numbering, lifecycle), `@workspace/templates` (template contract, templates, paginator, renderer, fonts). Apps: `web`, `server`.

## Architecture rules (non-negotiable)
1. **Layers never leak.** Invoice data (semantic) → calculation → view model → template (visual) → paginator (physical) → renderer (HTML) → preview and PDF. Invoice data has no coordinates, page numbers, fonts or colours. Templates contain no business math.
2. **One renderer.** The editor preview and the PDF are the same React `<InvoiceDocument>` producing the same explicit fixed-size page `<div>`s. The PDF is Puppeteer printing that same document at `/print/:id`. Never write a second PDF layout. Never rely on browser print page-breaking.
3. **Pagination is by measured height**, never by item count. The paginator is a pure function in `@workspace/templates`, unit-tested with fake heights. Browser code only measures.
4. **Money is integer minor units** (paise/cents) in storage and calculation, via big.js. No floats in money paths. Calculation lives only in `@workspace/shared`; UI and templates only display computed values.
5. **Templates are immutable once released.** Invoices store `templateId` + `templateVersion`. Changing a released template means a new version folder. Never edit a released version.
6. **Every DB query is workspace-scoped** through the repository layer.
7. **Invoice numbers are never reused.** Soft delete only. Overdue is derived, never stored.
8. **Fonts and assets are local and open source.** No CDN or network call at render time. Record every font's licence in `packages/templates/fonts/LICENSES.md`.
9. **Line-item quantity is optional.** A row with no quantity is a flat charge: amount = rate, and the quantity cell stays empty. Never default a missing quantity to 1 in the data or the display.

## Working rules
- Work phase by phase as in the build prompt. After each phase: `pnpm typecheck && pnpm lint && pnpm test` must pass, then commit with message `phase N: <title>`.
- Do not stop to ask questions mid-build. Decide, and append one line to `docs/DECISIONS.md` (decision + reason).
- Keep deferred features out of the code. They belong only in `docs/POSSIBLE_ADDITIONS.md`.
- Small files, no `any`, no dead code. No TODO without a `docs/DECISIONS.md` entry.
- App UI uses shadcn components from `@workspace/ui`; the generated `globals.css`/theme tokens are the source of truth for app styling. Template styling is separate (template tokens) and never uses app theme variables.
- Dates are ISO `YYYY-MM-DD` strings (no timezone). "Today" comes from the workspace timezone setting (default `Asia/Kolkata`).
- `docs/TEMPLATE_CONTRACT.md` mirrors `packages/templates/src/contract.ts`. Update both together; the code wins if they differ.

## Commands (must exist)
`pnpm dev` (web + server together) · `pnpm build` · `pnpm start` · `pnpm test` · `pnpm test:e2e` · `pnpm typecheck` · `pnpm lint` · `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:reset` · `pnpm user:create` · `pnpm fonts:add` · `pnpm template:shots <id> [--version N]`

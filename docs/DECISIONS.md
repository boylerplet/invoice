# Decisions

One line per decision: what + why. Newest at the bottom.

- Runtime is Windows-native Node 24 + pnpm 12.9.1 (user's choice); all scripts use cross-platform tools.
- Git repo initialised in the project root; one commit per phase (`phase N: <title>`).
- Puppeteer uses `puppeteer-core` with the installed Chrome/Edge (`PUPPETEER_EXECUTABLE_PATH`, auto-detected on Windows/Linux) to avoid a ~150 MB download.
- shadcn `init` partly failed (corrupt npm cache); scaffold was moved into the repo, converted to pnpm, and the preset re-applied with `shadcn apply b2zmLdDcpe`. The `--pointer` flag is not supported by `apply`, so pointer cursors are added in `globals.css`.
- Turbo removed; root scripts use `pnpm -r` (fewer moving parts, one less dependency).
- pnpm 12 blocks build scripts by default; allowed via `allowBuilds` in `pnpm-workspace.yaml` (esbuild, better-sqlite3, @node-rs/argon2).
- Server runs TypeScript directly through `tsx` in dev and prod (workspace packages are TS source); `pnpm build` builds the web app only.
- The reference image lives at `docs/references/invoice-01.png` (user's folder name kept instead of `docs/reference/`).
- InvoiceVM/RowVM types are defined in @workspace/shared (vm.ts) and re-exported by the templates contract, because templates depends on shared and shared builds the VM. Row money strings carry no currency symbol; only the total does (cleaner tables). Discounts use U+2212 minus.
- Invoice items capped at 200, children at 20 per item, adjustments at 10 (form-level limits so pagination stays solvable).
- Drafts are saved with a lenient schema (`invoiceDraftSchema`: calc-safe but may be incomplete); issuing and saving an ISSUED invoice use the strict `invoiceDocSchema` plus a non-negative-taxable check.
- Invoices table also stores `clientName`, `issuerName`, `reference` (denormalised from the snapshot) so list/search never loads the data JSON.
- Profiles, payment accounts and clients are archived (POST /:id/archive|unarchive), never hard-deleted, because invoices reference them.
- `/uploads/*` is public (unguessable UUID file names, CSP sandbox header) so the print page can load logos without a cookie; the rest of the API needs a session.
- SVG logos are rejected (not sanitised) if they contain script, event handlers, foreignObject, entities or external hrefs.
- Usernames are stored lowercase (case-insensitive uniqueness). Passwords need 8+ characters (the demo seed's `demo1234` fits).
- Backup ZIP includes every file in `data/uploads` (single-workspace deployment), plus `data.json` without password hashes.
- Duplicating an invoice copies its snapshots as-is (does not refresh from client/profile) and allocates a number from today's period.
- Server migrations are SQL files in `apps/server/drizzle`, generated with `pnpm --filter server exec drizzle-kit generate`, applied on every start.
- `FontFaceDef` gained an optional `unicodeRange` (fonts ship as latin + latin-ext subsets; ₹ is in latin-ext). `TemplateManifest.tokens` keys are full CSS custom property names (`--ink`).
- The page element carries the template class and tokens itself (page = template root) so `PageDecoration` can be absolutely positioned against the page while staying inside the scoped CSS.
- Measuring happens in an off-screen React root created and torn down by `measureInvoice()`; `useInvoiceLayout` keeps the last good layout (with the vm that produced it) on screen while re-measuring. Callers must memoize the vm.
- Row blocks are measured with `isFirstOnPage=false` / `isLastOnPage=false`; the template contract forbids block height depending on those flags.
- Pagination safety margin is 1px; when totals do not fit, at least one row always moves with them (totals never sit alone); a terminal-alone page is a last resort only.
- Template lab "page boxes" overlay shows page body and block outlines (no numeric heights). Dev routes (`/dev/templates/:id`, `/dev/registry`, `/print/fixture/:scenario`) exist only when `import.meta.env.DEV`.
- `template:shots` and the Playwright suites drive the installed Edge via Playwright (`channel: msedge`) or `PUPPETEER_EXECUTABLE_PATH`; the dev server is addressed as `localhost` (Vite binds IPv6 localhost).
- Template 01 footer wraps instead of truncating (fixed 9 mm height, two 7.5pt lines fit).
- E2E runs against an isolated server (`pnpm e2e:server`: DATA_DIR `.e2e-data`, API 3002, web 5174, reset + seeded per run). `tsx watch` exits when stdin is closed (as under Playwright), so the e2e scripts use plain `tsx`.
- In development the server accepts mutating requests from the Vite origin (`WEB_PORT`) because Vite's proxy rewrites Host; in production only same-host Origins pass.

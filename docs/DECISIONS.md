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

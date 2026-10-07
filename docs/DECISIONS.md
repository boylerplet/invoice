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

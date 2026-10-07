# Context

## Environment (user choices)

- Windows 11, Node 24, pnpm 12.9.1 (global npm install). Project path `D:\WSL\Ubuntu\home\work\softawre\invoice`, run **Windows-native** (not inside WSL).
- Shells: PowerShell and Git Bash both work. In Git Bash prefix `MSYS_NO_PATHCONV=1` when passing route arguments that start with `/` to scripts.
- PDF uses the installed Edge/Chrome via `puppeteer-core` (Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`). Playwright uses the same Edge (`channel: msedge`).
- Git is initialised; one commit per phase, message `phase N: <title>` plus the Co-Authored-By trailer from the session attribution.
- The user asked to make assumptions instead of stopping, and to log them in `docs/DECISIONS.md`.

## Repo map

- `apps/web` Vite React SPA. `apps/server` Hono + SQLite (Drizzle). `packages/ui` shadcn (style `base-maia`, Base UI, hugeicons). `packages/shared` domain. `packages/templates` template system.
- Add shadcn components with `cd apps/web && pnpm dlx shadcn@latest add <name>`; they land in `packages/ui/src/components`. The generator once wrote `from "cn"` imports and put dependencies in the web app; both were fixed by hand (imports use `@workspace/ui/lib/utils`; deps live in `packages/ui`).
- Server code: `apps/server/src/{routes,services,repos,auth,db,cli,seed}`; migrations in `apps/server/drizzle` (generate with `pnpm --filter server exec drizzle-kit generate`).
- Web code: `apps/web/src/{features,components,lib}`; routes in `src/router.tsx`.

## Commands

`pnpm dev` · `pnpm build` · `pnpm start` · `pnpm test` · `pnpm test:e2e` (= `playwright test`) · `pnpm typecheck` · `pnpm lint` · `pnpm format` · `pnpm db:migrate|db:reset|db:seed [--force]` · `pnpm user:create` · `pnpm fonts:add` · `pnpm template:shots <id> [--thumb]`. Demo login after `db:seed`: `demo` / `demo1234`.

## Gotchas

- pnpm 12 ignores dependency build scripts unless listed in `allowBuilds` (`pnpm-workspace.yaml`).
- Vite binds `localhost` (IPv6); address the dev server as `http://localhost:5173`, not 127.0.0.1.
- `tsx watch` exits when stdin closes (it does under Playwright); the e2e server scripts use plain `tsx`.
- Kill stuck servers with PowerShell: `Get-Process node | Stop-Process -Force`. Avoid `rm -rf node_modules` in Git Bash (slow); use `Remove-Item -Recurse -Force`.
- Web `typecheck` must use `tsc -p tsconfig.app.json` (the root `tsconfig.json` only has references, so `tsc --noEmit` on it checks nothing; this was a real bug found in Phase 8).
- Large multi-file shell heredocs in the Bash tool failed unpredictably; use the Write/Edit tools for source files.
- Prettier is configured with the Tailwind plugin; `pnpm format` was run over all code in Phase 8.
- Dev-only web routes (`/dev/templates/:id`, `/dev/registry`, `/print/fixture/:scenario`) exist only when `import.meta.env.DEV`.

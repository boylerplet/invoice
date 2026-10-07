# Context

## Environment (user choices)
- Windows 11, PowerShell/Git Bash, Node 24, pnpm 12.9.1 (npm global). Path: D:\WSL\Ubuntu\home\work\softawre\invoice (Windows-native, not run inside WSL).
- Chrome/Edge installed locally is used for PDF (puppeteer-core). Edge: C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe.
- Git initialised; commit per phase `phase N: <title>`, with the Co-Authored-By trailer from the session attribution.

## Repo map
- `apps/web` Vite React SPA · `apps/server` Hono + SQLite · `packages/ui` shadcn · `packages/shared` domain · `packages/templates` templates/paginator/renderer.
- shadcn style `base-maia` (Base UI, hugeicons). Add components with `cd apps/web && pnpm dlx shadcn@latest add <name>`; they land in `packages/ui/src/components`.

## Gotchas
- pnpm 12 ignores build scripts unless listed in `allowBuilds` (pnpm-workspace.yaml).
- Avoid `rm -rf node_modules` through Git Bash (slow); use PowerShell `Remove-Item -Recurse -Force`.

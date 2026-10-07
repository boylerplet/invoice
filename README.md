# Invoice Studio

A local-first invoice app for a small design or software studio. One login is one business. Create service invoices in a split-screen editor (form on the left, a paginated live preview on the right), keep them in folders per client, track their status, and export PDFs that match the preview page for page.

- **Local first**: runs on your own machine; data is a SQLite file and a folder of logos. Built to move to a home or office server later.
- **One renderer**: the editor preview and the PDF are the same React document, so what you see is what you print.
- **Designed output**: fonts, logo, rules and header art come from templates. One template ships ("Studio"); more can be added without touching the app.
- **Money is exact**: integer minor units (paise/cents), INR and USD, Indian or Western digit grouping.

## Requirements

- Node.js 20.19 or newer (developed on Node 24) and pnpm 12 (`npm i -g pnpm`)
- Chrome, Edge or Chromium installed, for PDF export (no download needed; see _PDF export_ below)

## Quick start

```bash
pnpm install
pnpm db:reset            # creates data/invoice.db
pnpm db:seed             # demo data: user "demo", password "demo1234"
pnpm dev                 # web on http://localhost:5173, API on http://127.0.0.1:3001
```

Open http://localhost:5173 and sign in as `demo` / `demo1234`. The seed is a fictional studio with 14 invoices in every state (draft, issued, overdue, paid, cancelled, one with three revisions, one in the Trash, a USD invoice on Letter paper and a three-page invoice). Dates are relative to today, so overdue and aging always look meaningful.

To start with an empty workspace instead of the demo data:

```bash
pnpm db:reset
pnpm user:create --username me --password "a long password" --workspace "My Studio"
```

There is no signup page. Users are created from the command line (`--workspace-id <id>` attaches another login to an existing business; one login always belongs to exactly one workspace).

## Commands

| Command                                                      | What it does                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `pnpm dev`                                                   | Web (5173, proxies `/api` and `/uploads`) and server (3001) with reload    |
| `pnpm build`                                                 | Type-checks and builds the web app into `apps/web/dist`                    |
| `pnpm start`                                                 | Production server: API plus the built web app on `PORT` (default 3001)     |
| `pnpm test`                                                  | Unit tests (shared domain, paginator, server API)                          |
| `pnpm test:e2e`                                              | Playwright: editor, lists, PDF parity, accessibility, template conformance |
| `pnpm typecheck` / `pnpm lint`                               | Gates that must be green before every commit                               |
| `pnpm db:migrate` / `db:reset` / `db:seed [--force]`         | Database helpers (migrations also run automatically on server start)       |
| `pnpm user:create --username … --password … --workspace "…"` | Add a login                                                                |
| `pnpm fonts:add --family "Inter" --source fontsource`        | Install an open-source font for templates                                  |
| `pnpm template:shots <id> [--version N] [--thumb]`           | Render every fixture × A4/Letter to `.template-shots/` for visual review   |

## Configuration

Copy `.env.example` to `.env` if you want to change anything. All values are optional.

| Variable                         | Default             | Meaning                                                                  |
| -------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `PORT`, `HOST`                   | `3001`, `127.0.0.1` | Where the production server listens. Use `HOST=0.0.0.0` to serve the LAN |
| `DATA_DIR`                       | `./data`            | Database, uploads and generated secrets                                  |
| `SESSION_SECRET`, `PRINT_SECRET` | generated           | Written to `data/secrets.json` on first run when not set                 |
| `COOKIE_SECURE`                  | `false`             | Set `true` when serving over HTTPS                                       |
| `PUPPETEER_EXECUTABLE_PATH`      | auto-detected       | Chrome/Edge/Chromium used for PDFs                                       |
| `PRINT_BASE_URL`                 | this server         | Where the headless browser opens `/print/:id` (rarely needed)            |
| `DEFAULT_TIMEZONE`               | `Asia/Kolkata`      | Timezone for new workspaces ("today" on invoices follows the workspace)  |

## Moving it to a LAN or home server

1. Copy the repo to the server, run `pnpm install` and `pnpm build`.
2. Create `.env` with `HOST=0.0.0.0` (and `PORT` if needed). Put a reverse proxy with HTTPS in front if the network is not fully trusted, and set `COOKIE_SECURE=true` when you do.
3. Install Chrome or Chromium on the server (`apt install chromium`) or set `PUPPETEER_EXECUTABLE_PATH`.
4. `pnpm user:create …` for the logins, then `pnpm start` (use your process manager of choice to keep it running).
5. Everything the server needs is in `DATA_DIR`.

Logins are rate limited (5 failures per 15 minutes per user and address), sessions are httpOnly cookies, and mutating requests are checked for a same-site `Origin`.

## Backup and restore

- **Whole backup**: stop the server and copy the `data/` folder (`invoice.db` plus `uploads/`). To restore, put it back and start the server. Copying while the server runs is fine for `uploads/`; for the database, prefer the export below or stop the server first.
- **Export from the app**: Settings → Data → _Export all data (ZIP)_ downloads `data.json` (every record, no password hashes) and all logos. The JSON-only link is also available at `/api/export/backup?format=json`.

## PDF export

PDFs are produced by printing the invoice's own print page (`/print/:id`) in a headless browser, so they match the preview exactly. The server finds Chrome, Edge or Chromium on its own (Windows, macOS and Linux locations); set `PUPPETEER_EXECUTABLE_PATH` if yours lives elsewhere. If none is found, the server logs a clear message at startup and export returns an explanatory error. One warm browser is reused between exports.

Exporting a draft asks whether to issue it. Issuing writes revision 1; from then on every save of an issued invoice adds a revision with an optional change note, and the History page can preview any revision or restore it as a new one.

## How the code is organised

```
apps/web         Vite + React SPA (shadcn/ui, TanStack Query, Zustand, React Hook Form)
apps/server      Hono API, SQLite via Drizzle, auth, PDF service, CLI scripts
packages/ui      shadcn components and theme (source of truth for app styling)
packages/shared  Domain: money, calculation, numbering, lifecycle, view model, zod schemas
packages/templates  Template contract, paginator, renderer, fonts, fixtures, template "studio"
docs/            BUILD_PROMPT, TEMPLATE_CONTRACT, DECISIONS, POSSIBLE_ADDITIONS
memory-bank/     Context for the next working session (progress, architecture notes)
```

Rules that matter (full list in `CLAUDE.md`): invoice data is semantic (no layout); templates contain no maths; pagination uses measured heights, never item counts; money is integer minor units; released templates are immutable (invoices store `templateId` + `templateVersion`); invoice numbers are never reused; everything is workspace-scoped.

## Adding a template

1. Create `packages/templates/src/templates/<id>/v1/` with `manifest.ts`, the block components, `template.css` (every selector prefixed `.tpl-<id>-v1`), and `index.tsx` exporting a `TemplateModule`. Start from the `studio` folder and read `docs/TEMPLATE_CONTRACT.md` for the rules.
2. Add the module to `MODULES` in `packages/templates/src/registry.ts`.
3. Open `/dev/templates/<id>` (dev server) to see it against every fixture, then run `pnpm template:shots <id> --thumb` and look at the images.
4. Run `pnpm test:e2e`. The conformance suite automatically checks every registered template on A4 and Letter for overflow, `<table>` elements, unscoped CSS, missing glyphs and unrendered `supports` flags.

A separate prompt (`TEMPLATE_DESIGN_PROMPT.md`) is intended for designing further templates against this contract.

To change a released template, create a new version folder (`v2`); never edit a released version.

## Adding a font

`pnpm fonts:add --family "Source Sans 3" --source fontsource --weights 400,600,700 --subsets latin,latin-ext` copies the font files and licence into `packages/templates/fonts/`, records it in `fonts/LICENSES.md` and prints the `fonts` array to paste into your manifest. For fonts from Google Fonts or Fontshare use `--source file --zip <path> --license OFL-1.1 --url <source-url>`. Only open-source fonts belong here, and the latin-ext subset is required because `₹` lives in it.

## Known limitations (v0.0.1)

- Service invoices only: no GST machinery (CGST/SGST/IGST, HSN/SAC, e-invoicing), no partial payments, no per-line tax or discounts, no email sending, no recurring invoices. See `docs/POSSIBLE_ADDITIONS.md`.
- Currencies: INR and USD (add more in `packages/shared/src/currencies.ts`).
- One template ships. Templates are written by a developer, not edited in the app.
- Dates in the browser's date inputs follow the browser locale; documents print as `15 Apr 2026`.

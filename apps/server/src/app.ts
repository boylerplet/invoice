import { serveStatic } from "@hono/node-server/serve-static"
import { existsSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { Hono } from "hono"
import { requireAuth, originCheck } from "./auth/middleware"
import { ApiError } from "./http/errors"
import type { AppEnv, Deps } from "./http/types"
import { authRoutes } from "./routes/auth"
import { clientRoutes } from "./routes/clients"
import { invoiceRoutes } from "./routes/invoices"
import { overviewRoutes } from "./routes/overview"
import { paymentAccountRoutes, profileRoutes } from "./routes/profiles"
import { workspaceRoutes } from "./routes/workspace"
import { createBackupService } from "./services/backup"
import { createInvoiceService } from "./services/invoices"
import { createStatsService } from "./services/stats"

export function createApp(deps: Deps) {
  const app = new Hono<AppEnv>()
  const stats = createStatsService(deps)
  const invoices = createInvoiceService(deps)
  const backup = createBackupService(deps)
  const guard = requireAuth(deps)

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json(
        { error: { code: error.code, message: error.message, fields: error.fields } },
        error.status
      )
    }
    console.error(error)
    return c.json({ error: { code: "INTERNAL", message: "Something went wrong" } }, 500)
  })

  const api = new Hono<AppEnv>()
  api.use("*", originCheck(deps))
  api.get("/health", (c) => c.json({ ok: true }))
  api.route("/auth", authRoutes(deps))

  const secured = new Hono<AppEnv>()
  secured.use("*", guard)
  secured.route("/workspace", workspaceRoutes(deps))
  secured.route("/issuer-profiles", profileRoutes(deps))
  secured.route("/payment-accounts", paymentAccountRoutes(deps))
  secured.route("/clients", clientRoutes(deps, stats))
  secured.route("/invoices", invoiceRoutes(deps, invoices))
  secured.route("/", overviewRoutes(deps, stats, backup))
  api.route("/", secured)
  api.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Unknown endpoint" } }, 404))
  app.route("/api", api)

  // Logos are served by unguessable file name so the print page can load them without a cookie.
  app.use(
    "/uploads/*",
    async (c, next) => {
      c.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
      c.header("X-Content-Type-Options", "nosniff")
      await next()
    },
    serveStatic({
      root: relative(process.cwd(), deps.config.uploadsDir) || ".",
      rewriteRequestPath: (path) => path.replace(/^\/uploads/, ""),
    })
  )

  if (existsSync(join(deps.config.webDist, "index.html"))) {
    app.use("*", serveStatic({ root: relative(process.cwd(), deps.config.webDist) || "." }))
    const html = readFileSync(join(deps.config.webDist, "index.html"), "utf8")
    app.get("*", (c) => c.html(html))
  }

  return app
}

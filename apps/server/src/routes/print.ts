import { Hono } from "hono"
import { ApiError } from "../http/errors"
import type { AppEnv, Deps } from "../http/types"
import { invoicesRepo } from "../repos/invoices"
import { verifyPrintToken } from "../services/printToken"

/**
 * Data for the print page. It has no session: the short-lived token (bound to one invoice
 * and workspace) is the only credential, so the headless browser can read exactly one invoice.
 */
export function printRoutes(deps: Deps) {
  const app = new Hono<AppEnv>()

  app.get("/:id", (c) => {
    const id = c.req.param("id")
    const claims = verifyPrintToken(
      deps.config.printSecret,
      c.req.query("token") ?? "",
      id,
      deps.now()
    )
    if (!claims)
      throw new ApiError(
        403,
        "BAD_TOKEN",
        "This print link is invalid or has expired"
      )
    const row = invoicesRepo(deps.db).get(claims.ws, id)
    if (!row) throw new ApiError(404, "NOT_FOUND", "Invoice not found")
    return c.json({ doc: row.data, status: row.status })
  })

  return app
}

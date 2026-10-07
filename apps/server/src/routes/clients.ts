import { clientInputSchema, type ClientInput } from "@workspace/shared"
import { Hono } from "hono"
import { jsonBody } from "../http/body"
import { ApiError, notFound } from "../http/errors"
import type { AppEnv, Deps } from "../http/types"
import { activityRepo } from "../repos/activity"
import { clientsRepo } from "../repos/clients"
import { paymentAccountsRepo, profilesRepo } from "../repos/profiles"
import type { StatsService } from "../services/stats"

export function clientRoutes(deps: Deps, stats: StatsService) {
  const app = new Hono<AppEnv>()
  const clients = () => clientsRepo(deps.db)

  function checkRefs(ws: string, input: ClientInput): void {
    const fields: Record<string, string> = {}
    if (input.defaultIssuerProfileId && !profilesRepo(deps.db).get(ws, input.defaultIssuerProfileId)) {
      fields.defaultIssuerProfileId = "Unknown issuer profile"
    }
    if (input.defaultPaymentAccountId && !paymentAccountsRepo(deps.db).get(ws, input.defaultPaymentAccountId)) {
      fields.defaultPaymentAccountId = "Unknown payment account"
    }
    if (Object.keys(fields).length > 0) {
      throw new ApiError(422, "VALIDATION", "Please check the highlighted fields", fields)
    }
  }

  function log(auth: { workspaceId: string; userId: string }, clientId: string, type: string, summary: string) {
    activityRepo(deps.db).log(auth.workspaceId, { userId: auth.userId, clientId, type, summary }, deps.now())
  }

  app.get("/", (c) => {
    const ws = c.get("auth").workspaceId
    const summaries = stats.clientSummaries(ws)
    const rows = clients().list(ws, c.req.query("archived") === "true")
    return c.json(rows.map((client) => ({ ...client, summary: summaries.get(client.id) ?? null })))
  })

  app.get("/:id", (c) => {
    const row = clients().get(c.get("auth").workspaceId, c.req.param("id"))
    if (!row) throw notFound("Client")
    return c.json(row)
  })

  app.get("/:id/summary", (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    if (!clients().get(ws, id)) throw notFound("Client")
    return c.json(stats.clientSummary(ws, id))
  })

  app.post("/", async (c) => {
    const auth = c.get("auth")
    const input = await jsonBody(c, clientInputSchema)
    checkRefs(auth.workspaceId, input)
    const row = clients().create(auth.workspaceId, input)
    log(auth, row.id, "client.created", `Added client ${row.name}`)
    return c.json(row, 201)
  })

  app.put("/:id", async (c) => {
    const auth = c.get("auth")
    const id = c.req.param("id")
    if (!clients().get(auth.workspaceId, id)) throw notFound("Client")
    const input = await jsonBody(c, clientInputSchema)
    checkRefs(auth.workspaceId, input)
    clients().update(auth.workspaceId, id, input)
    log(auth, id, "client.updated", `Updated client ${input.name}`)
    return c.json(clients().get(auth.workspaceId, id))
  })

  app.post("/:id/archive", (c) => {
    const auth = c.get("auth")
    const id = c.req.param("id")
    const client = clients().get(auth.workspaceId, id)
    if (!client) throw notFound("Client")
    clients().setArchived(auth.workspaceId, id, deps.now().toISOString())
    log(auth, id, "client.archived", `Archived client ${client.name}`)
    return c.json({ ok: true })
  })

  app.post("/:id/unarchive", (c) => {
    const auth = c.get("auth")
    const id = c.req.param("id")
    const client = clients().get(auth.workspaceId, id)
    if (!client) throw notFound("Client")
    clients().setArchived(auth.workspaceId, id, null)
    log(auth, id, "client.restored", `Restored client ${client.name}`)
    return c.json({ ok: true })
  })

  return app
}

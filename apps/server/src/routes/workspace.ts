import { workspaceUpdateSchema } from "@workspace/shared"
import { Hono } from "hono"
import { jsonBody } from "../http/body"
import { notFound } from "../http/errors"
import type { AppEnv, Deps } from "../http/types"
import { workspacesRepo } from "../repos/workspaces"

export function workspaceRoutes(deps: Deps) {
  const app = new Hono<AppEnv>()

  app.get("/", (c) => {
    const workspace = workspacesRepo(deps.db).get(c.get("auth").workspaceId)
    if (!workspace) throw notFound("Workspace")
    return c.json(workspace)
  })

  app.put("/", async (c) => {
    const ws = c.get("auth").workspaceId
    const input = await jsonBody(c, workspaceUpdateSchema)
    workspacesRepo(deps.db).update(ws, input)
    const workspace = workspacesRepo(deps.db).get(ws)
    if (!workspace) throw notFound("Workspace")
    return c.json(workspace)
  })

  return app
}

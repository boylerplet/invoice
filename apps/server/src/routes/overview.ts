import { Hono } from "hono"
import type { AppEnv, Deps } from "../http/types"
import { activityRepo } from "../repos/activity"
import type { BackupService } from "../services/backup"
import type { StatsService } from "../services/stats"

export function overviewRoutes(
  deps: Deps,
  stats: StatsService,
  backup: BackupService
) {
  const app = new Hono<AppEnv>()

  app.get("/dashboard", (c) =>
    c.json(stats.dashboard(c.get("auth").workspaceId))
  )

  app.get("/activity", (c) => {
    const page = activityRepo(deps.db).page(
      c.get("auth").workspaceId,
      c.req.query("cursor") ?? null
    )
    return c.json(page)
  })

  app.get("/export/backup", (c) => {
    const ws = c.get("auth").workspaceId
    const stamp = deps.now().toISOString().slice(0, 10)
    if (c.req.query("format") === "json") {
      c.header(
        "Content-Disposition",
        `attachment; filename="invoice-studio-backup-${stamp}.json"`
      )
      return c.json(backup.json(ws))
    }
    return new Response(backup.zip(ws), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="invoice-studio-backup-${stamp}.zip"`,
      },
    })
  })

  return app
}

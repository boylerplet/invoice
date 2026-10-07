import { and, desc, eq, lt, or } from "drizzle-orm"
import { activityLog } from "../db/schema"
import { type DbLike, newId } from "./types"

export type ActivityRow = typeof activityLog.$inferSelect

export interface ActivityInput {
  userId: string | null
  invoiceId?: string | null
  clientId?: string | null
  type: string
  summary: string
  meta?: Record<string, unknown> | null
}

export const PAGE_SIZE = 30

export const activityRepo = (db: DbLike) => ({
  log(ws: string, input: ActivityInput, now: Date): void {
    db.insert(activityLog)
      .values({
        id: newId(),
        workspaceId: ws,
        at: now.toISOString(),
        userId: input.userId,
        invoiceId: input.invoiceId ?? null,
        clientId: input.clientId ?? null,
        type: input.type,
        summary: input.summary,
        meta: input.meta ?? null,
      })
      .run()
  },

  /** Newest first. The cursor is "<at>|<id>" of the last row of the previous page. */
  page(ws: string, cursor: string | null): { rows: ActivityRow[]; next: string | null } {
    const [at, id] = cursor?.split("|") ?? []
    const after = at && id ? or(lt(activityLog.at, at), and(eq(activityLog.at, at), lt(activityLog.id, id))) : undefined
    const rows = db
      .select()
      .from(activityLog)
      .where(and(eq(activityLog.workspaceId, ws), after))
      .orderBy(desc(activityLog.at), desc(activityLog.id))
      .limit(PAGE_SIZE + 1)
      .all()
    const hasMore = rows.length > PAGE_SIZE
    const slice = rows.slice(0, PAGE_SIZE)
    const last = slice[slice.length - 1]
    return { rows: slice, next: hasMore && last ? `${last.at}|${last.id}` : null }
  },
})

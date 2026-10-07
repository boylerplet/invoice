import { and, asc, eq, isNull } from "drizzle-orm"
import type { ClientInput } from "@workspace/shared"
import { clients } from "../db/schema"
import { type DbLike, newId } from "./types"

export type ClientRow = typeof clients.$inferSelect

export const clientsRepo = (db: DbLike) => ({
  list(ws: string, includeArchived = false): ClientRow[] {
    return db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.workspaceId, ws),
          includeArchived ? undefined : isNull(clients.archivedAt)
        )
      )
      .orderBy(asc(clients.name))
      .all()
  },

  get: (ws: string, id: string): ClientRow | undefined =>
    db
      .select()
      .from(clients)
      .where(and(eq(clients.workspaceId, ws), eq(clients.id, id)))
      .get(),

  create(ws: string, input: ClientInput): ClientRow {
    const row = { id: newId(), workspaceId: ws, ...input, archivedAt: null }
    db.insert(clients).values(row).run()
    return row
  },

  update(ws: string, id: string, input: ClientInput): void {
    db.update(clients)
      .set(input)
      .where(and(eq(clients.workspaceId, ws), eq(clients.id, id)))
      .run()
  },

  setArchived(ws: string, id: string, archivedAt: string | null): void {
    db.update(clients)
      .set({ archivedAt })
      .where(and(eq(clients.workspaceId, ws), eq(clients.id, id)))
      .run()
  },
})

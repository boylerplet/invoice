import { eq } from "drizzle-orm"
import {
  activityLog,
  clients,
  invoiceRevisions,
  invoices,
  issuerProfiles,
  numberSequences,
  paymentAccounts,
  users,
  workspaces,
} from "../db/schema"
import type { DbLike } from "./types"

/** Every row that belongs to the workspace. Password hashes are never exported. */
export const backupRepo = (db: DbLike) => ({
  exportAll(ws: string) {
    return {
      workspace: db.select().from(workspaces).where(eq(workspaces.id, ws)).get() ?? null,
      users: db
        .select({ id: users.id, username: users.username, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.workspaceId, ws))
        .all(),
      issuerProfiles: db.select().from(issuerProfiles).where(eq(issuerProfiles.workspaceId, ws)).all(),
      paymentAccounts: db.select().from(paymentAccounts).where(eq(paymentAccounts.workspaceId, ws)).all(),
      clients: db.select().from(clients).where(eq(clients.workspaceId, ws)).all(),
      invoices: db.select().from(invoices).where(eq(invoices.workspaceId, ws)).all(),
      invoiceRevisions: db.select().from(invoiceRevisions).where(eq(invoiceRevisions.workspaceId, ws)).all(),
      numberSequences: db.select().from(numberSequences).where(eq(numberSequences.workspaceId, ws)).all(),
      activityLog: db.select().from(activityLog).where(eq(activityLog.workspaceId, ws)).all(),
    }
  },
})

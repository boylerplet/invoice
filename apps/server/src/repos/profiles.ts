import { and, asc, eq, isNull } from "drizzle-orm"
import type { IssuerProfileInput, PaymentAccountInput } from "@workspace/shared"
import { issuerProfiles, paymentAccounts } from "../db/schema"
import { type DbLike, newId } from "./types"

export type IssuerProfileRow = typeof issuerProfiles.$inferSelect
export type PaymentAccountRow = typeof paymentAccounts.$inferSelect

export const profilesRepo = (db: DbLike) => ({
  list(ws: string, includeArchived = false): IssuerProfileRow[] {
    return db
      .select()
      .from(issuerProfiles)
      .where(
        and(
          eq(issuerProfiles.workspaceId, ws),
          includeArchived ? undefined : isNull(issuerProfiles.archivedAt)
        )
      )
      .orderBy(asc(issuerProfiles.displayName))
      .all()
  },

  get: (ws: string, id: string): IssuerProfileRow | undefined =>
    db
      .select()
      .from(issuerProfiles)
      .where(and(eq(issuerProfiles.workspaceId, ws), eq(issuerProfiles.id, id)))
      .get(),

  create(ws: string, input: IssuerProfileInput): IssuerProfileRow {
    const row = {
      id: newId(),
      workspaceId: ws,
      ...input,
      logoFile: null,
      archivedAt: null,
    }
    db.insert(issuerProfiles).values(row).run()
    return row
  },

  update(ws: string, id: string, input: IssuerProfileInput): void {
    db.update(issuerProfiles)
      .set(input)
      .where(and(eq(issuerProfiles.workspaceId, ws), eq(issuerProfiles.id, id)))
      .run()
  },

  /** Make exactly one profile the default. */
  setDefault(ws: string, id: string): void {
    db.update(issuerProfiles)
      .set({ isDefault: false })
      .where(eq(issuerProfiles.workspaceId, ws))
      .run()
    db.update(issuerProfiles)
      .set({ isDefault: true })
      .where(and(eq(issuerProfiles.workspaceId, ws), eq(issuerProfiles.id, id)))
      .run()
  },

  setLogo(ws: string, id: string, logoFile: string | null): void {
    db.update(issuerProfiles)
      .set({ logoFile })
      .where(and(eq(issuerProfiles.workspaceId, ws), eq(issuerProfiles.id, id)))
      .run()
  },

  setArchived(ws: string, id: string, archivedAt: string | null): void {
    db.update(issuerProfiles)
      .set({ archivedAt })
      .where(and(eq(issuerProfiles.workspaceId, ws), eq(issuerProfiles.id, id)))
      .run()
  },
})

export const paymentAccountsRepo = (db: DbLike) => ({
  list(ws: string, includeArchived = false): PaymentAccountRow[] {
    return db
      .select()
      .from(paymentAccounts)
      .where(
        and(
          eq(paymentAccounts.workspaceId, ws),
          includeArchived ? undefined : isNull(paymentAccounts.archivedAt)
        )
      )
      .orderBy(asc(paymentAccounts.label))
      .all()
  },

  get: (ws: string, id: string): PaymentAccountRow | undefined =>
    db
      .select()
      .from(paymentAccounts)
      .where(
        and(eq(paymentAccounts.workspaceId, ws), eq(paymentAccounts.id, id))
      )
      .get(),

  create(ws: string, input: PaymentAccountInput): PaymentAccountRow {
    const row = { id: newId(), workspaceId: ws, ...input, archivedAt: null }
    db.insert(paymentAccounts).values(row).run()
    return row
  },

  update(ws: string, id: string, input: PaymentAccountInput): void {
    db.update(paymentAccounts)
      .set(input)
      .where(
        and(eq(paymentAccounts.workspaceId, ws), eq(paymentAccounts.id, id))
      )
      .run()
  },

  setArchived(ws: string, id: string, archivedAt: string | null): void {
    db.update(paymentAccounts)
      .set({ archivedAt })
      .where(
        and(eq(paymentAccounts.workspaceId, ws), eq(paymentAccounts.id, id))
      )
      .run()
  },
})

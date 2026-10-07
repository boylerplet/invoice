import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import { invoiceRevisions, invoices, numberSequences } from "../db/schema"
import { type DbLike, newId } from "./types"

export type InvoiceRow = typeof invoices.$inferSelect
export type RevisionRow = typeof invoiceRevisions.$inferSelect

/** List rows omit the heavy `data` JSON. */
const LIST_COLUMNS = {
  id: invoices.id,
  number: invoices.number,
  status: invoices.status,
  deletedAt: invoices.deletedAt,
  issueDate: invoices.issueDate,
  dueDate: invoices.dueDate,
  currency: invoices.currency,
  clientId: invoices.clientId,
  clientName: invoices.clientName,
  issuerProfileId: invoices.issuerProfileId,
  issuerName: invoices.issuerName,
  reference: invoices.reference,
  totalMinor: invoices.totalMinor,
  paidAt: invoices.paidAt,
  revision: invoices.revision,
  templateId: invoices.templateId,
  updatedAt: invoices.updatedAt,
} as const

export type InvoiceListRow = Pick<InvoiceRow, keyof typeof LIST_COLUMNS>

export interface InvoiceFilters {
  status?: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED" | "OVERDUE"
  clientId?: string
  profileId?: string
  currency?: string
  q?: string
  from?: string
  to?: string
  trash?: boolean
  sort?:
    | "issueDate_desc"
    | "issueDate_asc"
    | "total_desc"
    | "total_asc"
    | "number_desc"
    | "number_asc"
    | "due_asc"
  today: string
}

const escapeLike = (v: string) => v.replace(/[\\%_]/g, (ch) => `\\${ch}`)

function orderBy(sort: InvoiceFilters["sort"]): SQL[] {
  switch (sort) {
    case "issueDate_asc":
      return [asc(invoices.issueDate), asc(invoices.number)]
    case "total_desc":
      return [desc(invoices.totalMinor)]
    case "total_asc":
      return [asc(invoices.totalMinor)]
    case "number_desc":
      return [desc(invoices.number)]
    case "number_asc":
      return [asc(invoices.number)]
    case "due_asc":
      return [asc(sql`${invoices.dueDate} IS NULL`), asc(invoices.dueDate)]
    default:
      return [desc(invoices.issueDate), desc(invoices.number)]
  }
}

export const invoicesRepo = (db: DbLike) => ({
  get: (ws: string, id: string): InvoiceRow | undefined =>
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.workspaceId, ws), eq(invoices.id, id)))
      .get(),

  /** Includes soft-deleted and cancelled rows: numbers are never reused. */
  numberTaken(ws: string, number: string, exceptId?: string): boolean {
    const row = db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.workspaceId, ws), eq(invoices.number, number)))
      .get()
    return row !== undefined && row.id !== exceptId
  },

  insert(row: InvoiceRow): void {
    db.insert(invoices).values(row).run()
  },

  update(ws: string, id: string, patch: Partial<InvoiceRow>): void {
    db.update(invoices)
      .set(patch)
      .where(and(eq(invoices.workspaceId, ws), eq(invoices.id, id)))
      .run()
  },

  list(ws: string, f: InvoiceFilters): InvoiceListRow[] {
    const conditions: (SQL | undefined)[] = [eq(invoices.workspaceId, ws)]
    conditions.push(
      f.trash ? isNotNull(invoices.deletedAt) : isNull(invoices.deletedAt)
    )
    if (f.status === "OVERDUE") {
      conditions.push(
        eq(invoices.status, "ISSUED"),
        isNotNull(invoices.dueDate),
        lt(invoices.dueDate, f.today)
      )
    } else if (f.status) {
      conditions.push(eq(invoices.status, f.status))
    }
    if (f.clientId) conditions.push(eq(invoices.clientId, f.clientId))
    if (f.profileId) conditions.push(eq(invoices.issuerProfileId, f.profileId))
    if (f.currency)
      conditions.push(eq(invoices.currency, f.currency as "INR" | "USD"))
    if (f.from) conditions.push(gte(invoices.issueDate, f.from))
    if (f.to) conditions.push(lte(invoices.issueDate, f.to))
    if (f.q) {
      const pattern = `%${escapeLike(f.q)}%`
      conditions.push(
        or(
          sql`${invoices.number} LIKE ${pattern} ESCAPE '\\'`,
          sql`${invoices.clientName} LIKE ${pattern} ESCAPE '\\'`,
          sql`${invoices.reference} LIKE ${pattern} ESCAPE '\\'`
        )
      )
    }
    return db
      .select(LIST_COLUMNS)
      .from(invoices)
      .where(and(...conditions))
      .orderBy(...orderBy(f.sort))
      .all()
  },

  /** Every live invoice of the workspace, without the data blob. */
  listLive: (ws: string): InvoiceListRow[] =>
    db
      .select(LIST_COLUMNS)
      .from(invoices)
      .where(and(eq(invoices.workspaceId, ws), isNull(invoices.deletedAt)))
      .all(),

  allRows: (ws: string): InvoiceRow[] =>
    db.select().from(invoices).where(eq(invoices.workspaceId, ws)).all(),

  insertRevision(
    ws: string,
    invoiceId: string,
    rev: Omit<RevisionRow, "id" | "workspaceId" | "invoiceId">
  ): void {
    db.insert(invoiceRevisions)
      .values({ id: newId(), workspaceId: ws, invoiceId, ...rev })
      .run()
  },

  listRevisions: (ws: string, invoiceId: string): RevisionRow[] =>
    db
      .select()
      .from(invoiceRevisions)
      .where(
        and(
          eq(invoiceRevisions.workspaceId, ws),
          eq(invoiceRevisions.invoiceId, invoiceId)
        )
      )
      .orderBy(desc(invoiceRevisions.revision))
      .all(),

  getRevision: (
    ws: string,
    invoiceId: string,
    revision: number
  ): RevisionRow | undefined =>
    db
      .select()
      .from(invoiceRevisions)
      .where(
        and(
          eq(invoiceRevisions.workspaceId, ws),
          eq(invoiceRevisions.invoiceId, invoiceId),
          eq(invoiceRevisions.revision, revision)
        )
      )
      .get(),

  lastSequence(ws: string, periodKey: string): number {
    const row = db
      .select({ lastValue: numberSequences.lastValue })
      .from(numberSequences)
      .where(
        and(
          eq(numberSequences.workspaceId, ws),
          eq(numberSequences.periodKey, periodKey)
        )
      )
      .get()
    return row?.lastValue ?? 0
  },

  /** Raises the stored counter; never lowers it. */
  raiseSequence(ws: string, periodKey: string, value: number): void {
    db.insert(numberSequences)
      .values({ workspaceId: ws, periodKey, lastValue: value })
      .onConflictDoUpdate({
        target: [numberSequences.workspaceId, numberSequences.periodKey],
        set: { lastValue: sql`max(${numberSequences.lastValue}, ${value})` },
      })
      .run()
  },
})

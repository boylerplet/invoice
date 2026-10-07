import type {
  CurrencyCode,
  InvoiceDoc,
  InvoiceStatus,
  LabelValue,
  PaperSize,
  WorkspaceSettings,
} from "@workspace/shared"
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>()

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  settings: json<WorkspaceSettings>("settings").notNull(),
  createdAt: text("created_at").notNull(),
})

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("users_username").on(t.username)]
)

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
})

export const issuerProfiles = sqliteTable(
  "issuer_profiles",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    displayName: text("display_name").notNull(),
    legalName: text("legal_name"),
    addressLines: json<string[]>("address_lines").notNull(),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    taxIds: json<LabelValue[]>("tax_ids").notNull(),
    logoFile: text("logo_file"),
    defaultPaymentAccountId: text("default_payment_account_id"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull(),
    archivedAt: text("archived_at"),
  },
  (t) => [index("issuer_profiles_ws").on(t.workspaceId)]
)

export const paymentAccounts = sqliteTable(
  "payment_accounts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    issuerProfileId: text("issuer_profile_id"),
    label: text("label").notNull(),
    currency: text("currency").$type<CurrencyCode>().notNull(),
    kind: text("kind").$type<"bank" | "upi" | "other">().notNull(),
    lines: json<LabelValue[]>("lines").notNull(),
    archivedAt: text("archived_at"),
  },
  (t) => [index("payment_accounts_ws").on(t.workspaceId)]
)

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    addressLines: json<string[]>("address_lines").notNull(),
    email: text("email"),
    phone: text("phone"),
    taxIds: json<LabelValue[]>("tax_ids").notNull(),
    defaultIssuerProfileId: text("default_issuer_profile_id"),
    defaultPaymentAccountId: text("default_payment_account_id"),
    defaultCurrency: text("default_currency").$type<CurrencyCode>(),
    defaultDueDays: integer("default_due_days"),
    notes: text("notes"),
    archivedAt: text("archived_at"),
  },
  (t) => [index("clients_ws").on(t.workspaceId)]
)

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    number: text("number").notNull(),
    status: text("status").$type<InvoiceStatus>().notNull(),
    deletedAt: text("deleted_at"),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date"),
    currency: text("currency").$type<CurrencyCode>().notNull(),
    clientId: text("client_id").notNull(),
    clientName: text("client_name").notNull(),
    issuerProfileId: text("issuer_profile_id").notNull(),
    issuerName: text("issuer_name").notNull(),
    reference: text("reference"),
    totalMinor: integer("total_minor").notNull(),
    paidAt: text("paid_at"),
    paidNote: text("paid_note"),
    cancelledAt: text("cancelled_at"),
    cancelReason: text("cancel_reason"),
    templateId: text("template_id").notNull(),
    templateVersion: integer("template_version").notNull(),
    paperSize: text("paper_size").$type<PaperSize>().notNull(),
    revision: integer("revision").notNull(),
    data: json<InvoiceDoc>("data").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("invoices_status").on(t.workspaceId, t.status),
    index("invoices_issue_date").on(t.workspaceId, t.issueDate),
    index("invoices_client").on(t.workspaceId, t.clientId),
    uniqueIndex("invoices_number").on(t.workspaceId, t.number),
  ]
)

export const invoiceRevisions = sqliteTable(
  "invoice_revisions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    invoiceId: text("invoice_id").notNull(),
    revision: integer("revision").notNull(),
    data: json<InvoiceDoc>("data").notNull(),
    totalMinor: integer("total_minor").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("invoice_revisions_unique").on(t.invoiceId, t.revision)]
)

export const numberSequences = sqliteTable(
  "number_sequences",
  {
    workspaceId: text("workspace_id").notNull(),
    periodKey: text("period_key").notNull(),
    lastValue: integer("last_value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.periodKey] })]
)

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    at: text("at").notNull(),
    userId: text("user_id"),
    invoiceId: text("invoice_id"),
    clientId: text("client_id"),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
    meta: json<Record<string, unknown>>("meta"),
  },
  (t) => [index("activity_ws_at").on(t.workspaceId, t.at)]
)

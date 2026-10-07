import type { AgingBucket } from "./lifecycle"
import type { ClientInput, IssuerProfileInput, PaymentAccountInput } from "./master"
import type { CurrencyCode } from "./currencies"
import type { InvoiceDoc, InvoiceStatus } from "./schema"
import type { WorkspaceSettings } from "./workspace"

/** JSON shapes returned by the API. Shared so the web app and the server agree. */

export interface WorkspaceDto {
  id: string
  name: string
  timezone: string
  settings: WorkspaceSettings
}

export interface MeDto {
  user: { username: string }
  workspace: WorkspaceDto
}

export interface IssuerProfileDto extends IssuerProfileInput {
  id: string
  logoFile: string | null
  archivedAt: string | null
}

export interface PaymentAccountDto extends PaymentAccountInput {
  id: string
  archivedAt: string | null
}

export interface CurrencyTotals {
  billedMinor: number
  paidMinor: number
  outstandingMinor: number
}

export interface ClientSummaryDto {
  clientId: string
  invoiceCount: number
  lastInvoiceDate: string | null
  byCurrency: Partial<Record<CurrencyCode, CurrencyTotals>>
}

export interface ClientDto extends ClientInput {
  id: string
  archivedAt: string | null
  summary?: ClientSummaryDto | null
}

export interface InvoiceListRowDto {
  id: string
  number: string
  status: InvoiceStatus
  deletedAt: string | null
  issueDate: string
  dueDate: string | null
  currency: CurrencyCode
  clientId: string
  clientName: string
  issuerProfileId: string
  issuerName: string
  reference: string | null
  totalMinor: number
  paidAt: string | null
  revision: number
  templateId: string
  updatedAt: string
  isOverdue: boolean
}

export interface InvoiceListDto {
  today: string
  rows: InvoiceListRowDto[]
}

export interface InvoiceDetailDto {
  id: string
  number: string
  status: InvoiceStatus
  deletedAt: string | null
  revision: number
  totalMinor: number
  paidAt: string | null
  paidNote: string | null
  cancelledAt: string | null
  cancelReason: string | null
  isOverdue: boolean
  doc: InvoiceDoc
  createdAt: string
  updatedAt: string
}

export interface RevisionSummaryDto {
  revision: number
  totalMinor: number
  note: string | null
  createdAt: string
}

export interface RevisionDto extends RevisionSummaryDto {
  doc: InvoiceDoc
}

export interface AgingBucketDto {
  amountMinor: number
  count: number
}
export type AgingBucketsDto = Record<AgingBucket, AgingBucketDto>

export interface CurrencyDashboardDto {
  currency: CurrencyCode
  outstandingMinor: number
  overdueMinor: number
  overdueCount: number
  paidThisMonthMinor: number
  paidThisYearMinor: number
  draftsCount: number
  aging: AgingBucketsDto
  agingByClient: { clientId: string; clientName: string; buckets: AgingBucketsDto }[]
  topClients: { clientId: string; clientName: string; outstandingMinor: number }[]
}

export interface DashboardDto {
  today: string
  yearLabel: string
  yearStart: string
  currencies: CurrencyDashboardDto[]
  recent: Omit<InvoiceListRowDto, "isOverdue">[]
}

export interface ActivityDto {
  id: string
  at: string
  userId: string | null
  invoiceId: string | null
  clientId: string | null
  type: string
  summary: string
}

export interface ActivityPageDto {
  rows: ActivityDto[]
  next: string | null
}

export interface NextNumberDto {
  number: string
}

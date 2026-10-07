import {
  agingBucket,
  isOverdue,
  todayIn,
  type AgingBucketsDto,
  type ClientSummaryDto,
  type CurrencyCode,
  type CurrencyDashboardDto,
  type DashboardDto,
  type NumberingSettings,
} from "@workspace/shared"
import { invoicesRepo } from "../repos/invoices"
import { workspacesRepo } from "../repos/workspaces"
import type { Deps } from "../http/types"
import { notFound } from "../http/errors"

type Buckets = AgingBucketsDto

const emptyBuckets = (): Buckets => ({
  notDue: { amountMinor: 0, count: 0 },
  "1-30": { amountMinor: 0, count: 0 },
  "31-60": { amountMinor: 0, count: 0 },
  "61+": { amountMinor: 0, count: 0 },
})

/** Start of the reporting year: the financial year when numbering is financial, else calendar. */
export function yearStartFor(
  numbering: NumberingSettings,
  today: string
): string {
  const [y, m] = today.split("-").map(Number)
  const year = y ?? 1970
  const month = m ?? 1
  if (numbering.period !== "financial") return `${year}-01-01`
  const startYear = month >= numbering.fyStartMonth ? year : year - 1
  return `${startYear}-${String(numbering.fyStartMonth).padStart(2, "0")}-01`
}

export function createStatsService(deps: Deps) {
  return {
    clientSummaries(ws: string): Map<string, ClientSummaryDto> {
      const result = new Map<string, ClientSummaryDto>()
      for (const row of invoicesRepo(deps.db).listLive(ws)) {
        const summary = result.get(row.clientId) ?? {
          clientId: row.clientId,
          invoiceCount: 0,
          lastInvoiceDate: null,
          byCurrency: {},
        }
        summary.invoiceCount += 1
        if (
          !summary.lastInvoiceDate ||
          row.issueDate > summary.lastInvoiceDate
        ) {
          summary.lastInvoiceDate = row.issueDate
        }
        if (row.status === "ISSUED" || row.status === "PAID") {
          const totals = (summary.byCurrency[row.currency] ??= {
            billedMinor: 0,
            paidMinor: 0,
            outstandingMinor: 0,
          })
          totals.billedMinor += row.totalMinor
          if (row.status === "PAID") totals.paidMinor += row.totalMinor
          else totals.outstandingMinor += row.totalMinor
        }
        result.set(row.clientId, summary)
      }
      return result
    },

    clientSummary(ws: string, clientId: string): ClientSummaryDto {
      return (
        this.clientSummaries(ws).get(clientId) ?? {
          clientId,
          invoiceCount: 0,
          lastInvoiceDate: null,
          byCurrency: {},
        }
      )
    },

    dashboard(ws: string): DashboardDto {
      const workspace = workspacesRepo(deps.db).get(ws)
      if (!workspace) throw notFound("Workspace")
      const today = todayIn(workspace.timezone, deps.now())
      const yearStart = yearStartFor(workspace.settings.numbering, today)
      const rows = invoicesRepo(deps.db).listLive(ws)
      const byCurrency = new Map<CurrencyCode, CurrencyDashboardDto>()
      const clientBuckets = new Map<
        string,
        Map<string, { name: string; buckets: Buckets }>
      >()
      const outstandingByClient = new Map<
        string,
        Map<string, { name: string; amount: number }>
      >()

      const slot = (currency: CurrencyCode): CurrencyDashboardDto => {
        let entry = byCurrency.get(currency)
        if (!entry) {
          entry = {
            currency,
            outstandingMinor: 0,
            overdueMinor: 0,
            overdueCount: 0,
            paidThisMonthMinor: 0,
            paidThisYearMinor: 0,
            draftsCount: 0,
            aging: emptyBuckets(),
            agingByClient: [],
            topClients: [],
          }
          byCurrency.set(currency, entry)
        }
        return entry
      }

      for (const row of rows) {
        const entry = slot(row.currency)
        if (row.status === "DRAFT") entry.draftsCount += 1
        if (row.status === "PAID" && row.paidAt) {
          if (row.paidAt.slice(0, 7) === today.slice(0, 7))
            entry.paidThisMonthMinor += row.totalMinor
          if (row.paidAt >= yearStart && row.paidAt <= today)
            entry.paidThisYearMinor += row.totalMinor
        }
        const bucket = agingBucket(row, today)
        if (bucket === null) continue
        entry.outstandingMinor += row.totalMinor
        entry.aging[bucket].amountMinor += row.totalMinor
        entry.aging[bucket].count += 1
        if (isOverdue(row, today)) {
          entry.overdueMinor += row.totalMinor
          entry.overdueCount += 1
        }
        const perClient = clientBuckets.get(row.currency) ?? new Map()
        const cb = perClient.get(row.clientId) ?? {
          name: row.clientName,
          buckets: emptyBuckets(),
        }
        cb.buckets[bucket].amountMinor += row.totalMinor
        cb.buckets[bucket].count += 1
        perClient.set(row.clientId, cb)
        clientBuckets.set(row.currency, perClient)
        const outstanding = outstandingByClient.get(row.currency) ?? new Map()
        const prior = outstanding.get(row.clientId) ?? {
          name: row.clientName,
          amount: 0,
        }
        prior.amount += row.totalMinor
        outstanding.set(row.clientId, prior)
        outstandingByClient.set(row.currency, outstanding)
      }

      for (const [currency, entry] of byCurrency) {
        entry.agingByClient = [...(clientBuckets.get(currency) ?? [])]
          .map(([clientId, v]) => ({
            clientId,
            clientName: v.name,
            buckets: v.buckets,
          }))
          .sort((a, b) => a.clientName.localeCompare(b.clientName))
        entry.topClients = [...(outstandingByClient.get(currency) ?? [])]
          .map(([clientId, v]) => ({
            clientId,
            clientName: v.name,
            outstandingMinor: v.amount,
          }))
          .sort((a, b) => b.outstandingMinor - a.outstandingMinor)
          .slice(0, 5)
      }

      const recent = [...rows]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8)
      const financial = workspace.settings.numbering.period === "financial"
      return {
        today,
        yearStart,
        yearLabel: financial ? "this financial year" : "this year",
        currencies: [...byCurrency.values()].sort((a, b) =>
          a.currency.localeCompare(b.currency)
        ),
        recent,
      }
    },
  }
}

export type StatsService = ReturnType<typeof createStatsService>

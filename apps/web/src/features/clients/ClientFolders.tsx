import { Link } from "react-router"
import { CURRENCY_CODES } from "@workspace/shared"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { EmptyState } from "@/components/PageHeader"
import { money, shortDate } from "@/lib/format"
import { useClients } from "@/lib/queries"

/** "By client" tab: every client as a folder card. */
export function ClientFolders() {
  const clients = useClients()
  if (clients.isPending) return <Skeleton className="h-40 w-full" />
  const active = (clients.data ?? []).filter((c) => !c.archivedAt)
  if (active.length === 0) {
    return (
      <EmptyState
        title="No clients yet"
        hint="Clients are folders of invoices. Add one to begin."
        action={
          <Link className="text-sm text-primary underline" to="/clients">
            Go to clients
          </Link>
        }
      />
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {active.map((client) => {
        const summary = client.summary
        return (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-colors hover:border-foreground/30">
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {summary?.invoiceCount ?? 0} invoice
                    {summary?.invoiceCount === 1 ? "" : "s"}
                    {summary?.lastInvoiceDate
                      ? ` · last ${shortDate(summary.lastInvoiceDate)}`
                      : ""}
                  </p>
                </div>
                <div className="space-y-0.5 text-sm">
                  {CURRENCY_CODES.flatMap((code) => {
                    const totals = summary?.byCurrency[code]
                    return totals && totals.outstandingMinor > 0
                      ? [
                          <p key={code} className="flex justify-between">
                            <span className="text-muted-foreground">
                              Outstanding
                            </span>
                            <span className="font-medium tabular-nums">
                              {money(totals.outstandingMinor, code)}
                            </span>
                          </p>,
                        ]
                      : []
                  })}
                  {!summary ||
                  CURRENCY_CODES.every(
                    (c) => (summary.byCurrency[c]?.outstandingMinor ?? 0) === 0
                  ) ? (
                    <p className="text-muted-foreground">Nothing outstanding</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

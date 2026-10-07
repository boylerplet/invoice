import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { CURRENCY_CODES } from "@workspace/shared"
import { useState } from "react"
import { Link, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Icon } from "@/components/Icon"
import { EditSheet } from "@/components/form/EditSheet"
import { EmptyState, PageHeader } from "@/components/PageHeader"
import { InvoiceFilters } from "@/features/invoices/InvoiceFilters"
import { InvoiceTable } from "@/features/invoices/InvoiceTable"
import { useListParams } from "@/features/invoices/useListParams"
import { useRowActions } from "@/features/invoices/useRowActions"
import { money } from "@/lib/format"
import { useInvoiceList } from "@/lib/invoiceQueries"
import { useClients } from "@/lib/queries"
import { ClientForm } from "./ClientForm"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

/** A client "folder": details, billed / paid / outstanding, and its invoices. */
export function ClientPage() {
  const { id = "" } = useParams()
  const clients = useClients()
  const params = useListParams()
  const list = useInvoiceList({ ...params.filters, clientId: id })
  const { onAction, dialogs } = useRowActions(list.data?.today ?? "")
  const [editing, setEditing] = useState(false)
  const client = clients.data?.find((c) => c.id === id)

  if (clients.isPending) return <Skeleton className="m-6 h-64" />
  if (!client) return <div className="p-6"><EmptyState title="Client not found" action={<Link className="text-primary text-sm underline" to="/clients">Back to clients</Link>} /></div>
  const byCurrency = CURRENCY_CODES.flatMap((code) => (client.summary?.byCurrency[code] ? [{ code, totals: client.summary.byCurrency[code] }] : []))

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={client.name}
        description={[client.contactPerson, client.email, client.phone].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Icon icon={PencilEdit02Icon} /> Edit
            </Button>
            <Button render={<Link to={`/invoices/new?clientId=${client.id}`} />} nativeButton={false}>
              <Icon icon={Add01Icon} /> New invoice for this client
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            {client.addressLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            {client.taxIds.map((tax, i) => (
              <p key={i}>
                <span className="text-muted-foreground">{tax.label}</span> {tax.value}
              </p>
            ))}
            {client.notes && <p className="text-muted-foreground pt-2">{client.notes}</p>}
          </div>
          <div className="space-y-4">
            {byCurrency.length === 0 && <p className="text-muted-foreground text-sm">No issued invoices yet.</p>}
            {byCurrency.map(({ code, totals }) => (
              <div key={code} className="grid grid-cols-3 gap-3" data-testid={`summary-${code}`}>
                <Stat label={`Billed ${code}`} value={money(totals.billedMinor, code)} />
                <Stat label="Paid" value={money(totals.paidMinor, code)} />
                <Stat label="Outstanding" value={money(totals.outstandingMinor, code)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <InvoiceFilters params={params} hideClient />
      {list.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (list.data?.rows.length ?? 0) === 0 ? (
        <EmptyState title={params.hasFilters ? "No invoices match these filters" : "No invoices for this client yet"} />
      ) : (
        <InvoiceTable rows={list.data?.rows ?? []} group="month" hideClient onAction={onAction} />
      )}
      {dialogs}
      <EditSheet open={editing} onOpenChange={setEditing} title="Edit client">
        {editing && <ClientForm client={client} onSaved={() => setEditing(false)} />}
      </EditSheet>
    </div>
  )
}

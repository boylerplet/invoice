import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { EmptyState } from "@/components/PageHeader"
import { StatusBadge } from "@/components/StatusBadge"
import { PreviewPanel } from "@/features/editor/PreviewPanel"
import { useInvoiceVm } from "@/features/editor/useInvoiceVm"
import { money, relativeTime } from "@/lib/format"
import { useInvoice, useRevision, useRevisions, useSaveInvoice } from "@/lib/invoiceQueries"

/** Every saved revision of an issued invoice, with a read-only preview and "restore as new revision". */
export function HistoryPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const invoice = useInvoice(id)
  const revisions = useRevisions(id)
  const [selected, setSelected] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const save = useSaveInvoice(id)
  const list = revisions.data ?? []
  const current = selected ?? list[0]?.revision ?? null
  const revision = useRevision(id, current)
  const preview = useInvoiceVm(revision.data?.doc ?? null, invoice.data?.status ?? "ISSUED")
  const canRestore = invoice.data?.status === "ISSUED" && current !== null && current !== list[0]?.revision

  if (invoice.isPending || revisions.isPending) return <Skeleton className="m-6 h-96" />
  if (!invoice.data) return <div className="p-6"><EmptyState title="Invoice not found" /></div>

  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="sm" render={<Link to={`/invoices/${id}`} />} nativeButton={false}>Back to invoice</Button>
        <h1 className="font-semibold tabular-nums">{invoice.data.number}</h1>
        <StatusBadge status={invoice.data.status} overdue={invoice.data.isOverdue} />
        <span className="text-muted-foreground text-sm">History</span>
        <div className="flex-1" />
        {canRestore && <Button onClick={() => setConfirming(true)}>Restore as new revision</Button>}
      </div>
      {list.length === 0 ? (
        <div className="p-6"><EmptyState title="No revisions yet" hint="Revision 1 is written when the invoice is issued." /></div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[20rem_1fr]">
          <ul className="min-h-0 divide-y overflow-y-auto border-r" aria-label="Revisions">
            {list.map((r) => (
              <li key={r.revision}>
                <button
                  type="button"
                  onClick={() => setSelected(r.revision)}
                  aria-current={r.revision === current}
                  className={cn("hover:bg-accent/50 w-full px-4 py-3 text-left", r.revision === current && "bg-accent")}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">Revision {r.revision}</span>
                    <span className="text-sm tabular-nums">{money(r.totalMinor, invoice.data.doc.currency)}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{relativeTime(r.createdAt)}</p>
                  {r.note && <p className="mt-1 text-sm">{r.note}</p>}
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden min-h-0 lg:block">
            {preview ? <PreviewPanel vm={preview.vm} template={preview.template} paper={revision.data?.doc.presentation.paperSize ?? "A4"} /> : <Skeleton className="m-6 h-96" />}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Restore revision ${current}?`}
        description="The invoice takes that revision's content and a new revision is saved, so nothing is lost."
        confirmLabel="Restore"
        busy={save.isPending}
        onConfirm={() => {
          const doc = revision.data?.doc
          if (!doc) return
          save.mutate(
            { doc, changeNote: `Restored revision ${current}` },
            { onSuccess: () => { toast.success("Revision restored"); navigate(`/invoices/${id}`) }, onError: (e) => toast.error(e.message) }
          )
        }}
      />
    </div>
  )
}

import type { InvoiceListRowDto } from "@workspace/shared"
import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { downloadFile } from "@/lib/download"
import { useInvoiceAction } from "@/lib/invoiceQueries"
import { CancelDialog, PayDialog, SimpleActionDialog } from "./InvoiceDialogs"
import type { RowAction } from "./InvoiceTable"

/** Row-menu behaviour shared by every invoice list: navigation, direct actions and confirmation dialogs. */
export function useRowActions(today: string): {
  onAction: (action: RowAction, row: InvoiceListRowDto) => void
  dialogs: ReactNode
} {
  const navigate = useNavigate()
  const run = useInvoiceAction()
  const [dialog, setDialog] = useState<{
    action: "pay" | "cancel" | "discard" | "reopen"
    row: InvoiceListRowDto
  } | null>(null)
  const close = () => setDialog(null)

  function onAction(action: RowAction, row: InvoiceListRowDto) {
    switch (action) {
      case "open":
        return void navigate(`/invoices/${row.id}`)
      case "pdf":
        return void toast.promise(
          downloadFile(
            `/invoices/${row.id}/pdf?issue=false`,
            `${row.number}.pdf`
          ),
          {
            loading: `Creating PDF for ${row.number}...`,
            success: (name) => `Saved ${name}`,
            error: (e: unknown) =>
              e instanceof Error ? e.message : "Could not create the PDF",
          }
        )
      case "duplicate":
        return run.mutate(
          { id: row.id, action: "duplicate" },
          {
            onSuccess: (copy) => {
              toast.success(`Created draft ${copy.number}`)
              navigate(`/invoices/${copy.id}`)
            },
            onError: (e) => toast.error(e.message),
          }
        )
      case "restore":
        return run.mutate(
          { id: row.id, action: "restore" },
          {
            onSuccess: () => toast.success(`Restored ${row.number}`),
            onError: (e) => toast.error(e.message),
          }
        )
      default:
        return setDialog({ action, row })
    }
  }

  const target = dialog?.row ?? null
  const dialogs = (
    <>
      <PayDialog
        target={dialog?.action === "pay" ? target : null}
        today={today}
        onClose={close}
      />
      <CancelDialog
        target={dialog?.action === "cancel" ? target : null}
        onClose={close}
      />
      <SimpleActionDialog
        action={
          dialog?.action === "discard" || dialog?.action === "reopen"
            ? dialog.action
            : null
        }
        target={target}
        onClose={close}
      />
    </>
  )
  return { onAction, dialogs }
}

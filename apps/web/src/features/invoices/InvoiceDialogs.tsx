import type { InvoiceDetailDto, InvoiceListRowDto } from "@workspace/shared"
import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@workspace/ui/components/input"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Field } from "@/components/form/Field"
import { useCancelAction, useInvoiceAction, usePayAction } from "@/lib/invoiceQueries"

type Target = Pick<InvoiceListRowDto, "id" | "number"> | Pick<InvoiceDetailDto, "id" | "number">

interface DialogProps {
  target: Target | null
  today: string
  onClose: () => void
  onDone?: (detail: InvoiceDetailDto) => void
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong")

/** Mark paid: asks for the payment date and an optional note. */
export function PayDialog({ target, today, onClose, onDone }: DialogProps) {
  const pay = usePayAction()
  const [paidDate, setPaidDate] = useState(today)
  const [note, setNote] = useState("")
  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`Mark ${target?.number ?? ""} as paid`}
      description="The invoice becomes read-only. You can reopen it later."
      confirmLabel="Mark as paid"
      busy={pay.isPending}
      onConfirm={() => {
        if (!target) return
        pay.mutate(
          { id: target.id, input: { paidDate, note: note || null } },
          { onSuccess: (detail) => { toast.success(`${target.number} marked as paid`); onClose(); onDone?.(detail) }, onError: (e) => toast.error(errorText(e)) }
        )
      }}
    >
      <div className="space-y-3">
        <Field label="Date received" htmlFor="paid-date">
          <Input id="paid-date" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)" htmlFor="paid-note">
          <Input id="paid-note" placeholder="e.g. UPI reference" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </ConfirmDialog>
  )
}

/** Cancel: terminal, but the invoice can still be duplicated. */
export function CancelDialog({ target, onClose, onDone }: Omit<DialogProps, "today">) {
  const cancel = useCancelAction()
  const [reason, setReason] = useState("")
  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`Cancel ${target?.number ?? ""}?`}
      description="A cancelled invoice cannot be edited and its number is not reused. You can duplicate it into a new draft."
      confirmLabel="Cancel invoice"
      destructive
      busy={cancel.isPending}
      onConfirm={() => {
        if (!target) return
        cancel.mutate(
          { id: target.id, input: { reason: reason || null } },
          { onSuccess: (detail) => { toast.success(`${target.number} cancelled`); onClose(); onDone?.(detail) }, onError: (e) => toast.error(errorText(e)) }
        )
      }}
    >
      <Field label="Reason (optional)" htmlFor="cancel-reason">
        <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </ConfirmDialog>
  )
}

type SimpleAction = "discard" | "reopen" | "issue"

const COPY: Record<SimpleAction, { title: (n: string) => string; description: string; confirm: string; done: string; destructive?: boolean }> = {
  discard: { title: (n) => `Discard draft ${n}?`, description: "It moves to the Trash and can be restored. Its number stays reserved.", confirm: "Discard draft", done: "Draft discarded", destructive: true },
  reopen: { title: (n) => `Reopen ${n}?`, description: "The invoice returns to Issued and becomes editable again. This is recorded in the activity log.", confirm: "Reopen", done: "Invoice reopened" },
  issue: { title: (n) => `Mark ${n} as issued?`, description: "Issuing saves revision 1. After that, every save creates a new revision.", confirm: "Mark as issued", done: "Invoice issued" },
}

/** Confirmation for transitions that need no extra input. */
export function SimpleActionDialog({ action, target, onClose, onDone }: Omit<DialogProps, "today"> & { action: SimpleAction | null }) {
  const run = useInvoiceAction()
  const copy = action ? COPY[action] : null
  return (
    <ConfirmDialog
      open={target !== null && action !== null}
      onOpenChange={(open) => !open && onClose()}
      title={copy && target ? copy.title(target.number) : ""}
      description={copy?.description}
      confirmLabel={copy?.confirm ?? "Confirm"}
      destructive={copy?.destructive}
      busy={run.isPending}
      onConfirm={() => {
        if (!target || !action || !copy) return
        run.mutate(
          { id: target.id, action },
          { onSuccess: (detail) => { toast.success(copy.done); onClose(); onDone?.(detail) }, onError: (e) => toast.error(errorText(e)) }
        )
      }}
    />
  )
}

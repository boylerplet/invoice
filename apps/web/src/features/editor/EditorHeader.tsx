import { ArrowLeft01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import type { InvoiceDetailDto } from "@workspace/shared"
import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Icon } from "@/components/Icon"
import { StatusBadge } from "@/components/StatusBadge"
import type { SaveState } from "./editorStore"

export type HeaderAction = "export" | "issue" | "pay" | "cancel" | "reopen" | "duplicate" | "discard"

interface EditorHeaderProps {
  detail: InvoiceDetailDto
  number: string
  dirty: boolean
  saveState: SaveState
  savedAt: string | null
  onSave: () => void
  onRetry: () => void
  onAction: (action: HeaderAction) => void
}

function SaveIndicator({ detail, dirty, saveState, savedAt, onRetry }: Pick<EditorHeaderProps, "detail" | "dirty" | "saveState" | "savedAt" | "onRetry">) {
  if (detail.status === "PAID" || detail.status === "CANCELLED") return null
  if (saveState === "error") {
    return (
      <span className="text-destructive text-xs" role="status">
        Save failed.{" "}
        <button type="button" className="underline" onClick={onRetry}>
          Retry
        </button>
      </span>
    )
  }
  if (saveState === "saving") return <span className="text-muted-foreground text-xs" role="status">Saving…</span>
  if (dirty) return <span className="text-muted-foreground text-xs" role="status">{detail.status === "DRAFT" ? "Unsaved changes" : "Unsaved changes: press Save changes"}</span>
  if (savedAt) {
    const time = new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return <span className="text-muted-foreground text-xs" role="status">Saved {time}</span>
  }
  return <span className="text-muted-foreground text-xs" role="status">All changes saved</span>
}

export function EditorHeader(props: EditorHeaderProps) {
  const { detail, number, dirty, onSave, onAction } = props
  const { status } = detail
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <Button variant="ghost" size="icon-sm" aria-label="Back to invoices" render={<Link to="/invoices" />} nativeButton={false}>
        <Icon icon={ArrowLeft01Icon} />
      </Button>
      <h1 className="text-base font-semibold tabular-nums" data-testid="invoice-number">{number}</h1>
      <StatusBadge status={status} overdue={detail.isOverdue} />
      <SaveIndicator {...props} />
      <div className="flex-1" />
      <Button variant={status === "DRAFT" ? "default" : "outline"} onClick={() => onAction("export")}>Export PDF</Button>
      {status === "DRAFT" && <Button variant="outline" onClick={() => onAction("issue")}>Mark as issued</Button>}
      {status === "ISSUED" && (
        <>
          <Button disabled={!dirty} onClick={onSave}>Save changes</Button>
          <Button variant="outline" onClick={() => onAction("pay")}>Mark paid</Button>
          <Button variant="outline" onClick={() => onAction("cancel")}>Cancel invoice</Button>
        </>
      )}
      {status === "PAID" && <Button variant="outline" onClick={() => onAction("reopen")}>Reopen</Button>}
      {(status === "PAID" || status === "CANCELLED") && <Button onClick={() => onAction("duplicate")}>Duplicate</Button>}
      <Button variant="ghost" render={<Link to={`/invoices/${detail.id}/history`} />} nativeButton={false}>History</Button>
      {(status === "DRAFT" || status === "ISSUED") && (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
          <Icon icon={MoreHorizontalIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {(status === "DRAFT" || status === "ISSUED") && <DropdownMenuItem onClick={() => onAction("duplicate")}>Duplicate</DropdownMenuItem>}
            {status === "DRAFT" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onAction("discard")}>Discard draft</DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      )}
    </div>
  )
}

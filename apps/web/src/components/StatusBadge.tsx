import type { InvoiceStatus } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const STYLES: Record<InvoiceStatus | "OVERDUE", string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ISSUED: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  PAID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  CANCELLED: "bg-muted text-muted-foreground line-through",
  OVERDUE: "bg-red-500/15 text-red-700 dark:text-red-300",
}

const LABELS: Record<InvoiceStatus | "OVERDUE", string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue",
}

/** Overdue is derived: pass `overdue` for an ISSUED invoice that is past due. */
export function StatusBadge({ status, overdue = false, className }: { status: InvoiceStatus; overdue?: boolean; className?: string }) {
  const key = status === "ISSUED" && overdue ? "OVERDUE" : status
  return (
    <Badge variant="ghost" className={cn("font-medium", STYLES[key], className)}>
      {LABELS[key]}
    </Badge>
  )
}

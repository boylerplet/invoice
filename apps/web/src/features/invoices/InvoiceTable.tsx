import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import type { InvoiceListRowDto } from "@workspace/shared"
import { Fragment } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Icon } from "@/components/Icon"
import { StatusBadge } from "@/components/StatusBadge"
import { money, shortDate } from "@/lib/format"

export type RowAction =
  | "open"
  | "pdf"
  | "duplicate"
  | "pay"
  | "cancel"
  | "discard"
  | "reopen"
  | "restore"

interface InvoiceTableProps {
  rows: InvoiceListRowDto[]
  /** "month" groups under month headings, "profile" under issuer profile headings. */
  group: "month" | "profile" | "none"
  hideClient?: boolean
  onAction: (action: RowAction, row: InvoiceListRowDto) => void
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function monthHeading(issueDate: string): string {
  const [year, month] = issueDate.split("-")
  return `${MONTHS[Number(month) - 1] ?? ""} ${year ?? ""}`
}

function groupKey(
  row: InvoiceListRowDto,
  group: InvoiceTableProps["group"]
): string {
  if (group === "month") return monthHeading(row.issueDate)
  return group === "profile" ? row.issuerName : ""
}

function RowMenu({
  row,
  onAction,
}: {
  row: InvoiceListRowDto
  onAction: InvoiceTableProps["onAction"]
}) {
  const trashed = row.deletedAt !== null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${row.number}`}
          />
        }
      >
        <Icon icon={MoreHorizontalIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {trashed ? (
            <DropdownMenuItem onClick={() => onAction("restore", row)}>
              Restore
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => onAction("open", row)}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("pdf", row)}>
                Download PDF
              </DropdownMenuItem>
              {row.status === "ISSUED" && (
                <DropdownMenuItem onClick={() => onAction("pay", row)}>
                  Mark paid
                </DropdownMenuItem>
              )}
              {row.status === "PAID" && (
                <DropdownMenuItem onClick={() => onAction("reopen", row)}>
                  Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onAction("duplicate", row)}>
                Duplicate
              </DropdownMenuItem>
              {row.status === "ISSUED" && (
                <DropdownMenuItem onClick={() => onAction("cancel", row)}>
                  Cancel invoice
                </DropdownMenuItem>
              )}
              {row.status === "DRAFT" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onAction("discard", row)}
                  >
                    Discard draft
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function InvoiceTable({
  rows,
  group,
  hideClient,
  onAction,
}: InvoiceTableProps) {
  const columns = hideClient ? 6 : 7
  // A heading goes above the first row of every run of rows that share a group key.
  const headings = new Map<string, string>()
  if (group !== "none") {
    let previous: string | null = null
    for (const row of rows) {
      const key = groupKey(row, group)
      if (key !== previous) headings.set(row.id, key)
      previous = key
    }
  }
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            {!hideClient && <TableHead>Client</TableHead>}
            <TableHead>Issued</TableHead>
            <TableHead className="hidden md:table-cell">Due</TableHead>
            <TableHead className="hidden lg:table-cell">Profile</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const heading = headings.get(row.id)
            return (
              <Fragment key={row.id}>
                {heading && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={columns + 1}
                      className="py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {heading}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow
                  className="cursor-pointer"
                  onClick={() => onAction("open", row)}
                  data-testid="invoice-row"
                >
                  <TableCell className="font-medium tabular-nums">
                    <Link
                      to={`/invoices/${row.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.number}
                    </Link>
                  </TableCell>
                  {!hideClient && <TableCell>{row.clientName}</TableCell>}
                  <TableCell className="text-muted-foreground tabular-nums">
                    {shortDate(row.issueDate)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                    {shortDate(row.dueDate)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {row.issuerName}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} overdue={row.isOverdue} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {money(row.totalMinor, row.currency)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RowMenu row={row} onAction={onAction} />
                  </TableCell>
                </TableRow>
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

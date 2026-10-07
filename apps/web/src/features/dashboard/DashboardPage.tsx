import { Add01Icon } from "@hugeicons/core-free-icons"
import {
  AGING_BUCKETS,
  type AgingBucket,
  type AgingBucketsDto,
  type CurrencyDashboardDto,
} from "@workspace/shared"
import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Icon } from "@/components/Icon"
import { EmptyState, PageHeader } from "@/components/PageHeader"
import { StatusBadge } from "@/components/StatusBadge"
import { money, shortDate } from "@/lib/format"
import { useDashboard } from "@/lib/invoiceQueries"

const BUCKET_LABELS: Record<AgingBucket, string> = {
  notDue: "Not yet due",
  "1-30": "1-30 days",
  "31-60": "31-60 days",
  "61+": "61+ days",
}

function Stat({
  label,
  value,
  hint,
  testId,
}: {
  label: string
  value: string
  hint?: string
  testId: string
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-xl font-semibold tabular-nums" data-testid={testId}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function AgingTable({ data }: { data: CurrencyDashboardDto }) {
  const cell = (buckets: AgingBucketsDto, key: AgingBucket) =>
    buckets[key].count === 0 ? (
      <span className="text-muted-foreground">-</span>
    ) : (
      <span className="tabular-nums">
        {money(buckets[key].amountMinor, data.currency)}
      </span>
    )
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging, {data.currency}</CardTitle>
        <CardDescription>
          Outstanding invoices by how long they are past due.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              {AGING_BUCKETS.map((key) => (
                <TableHead key={key} className="text-right">
                  {BUCKET_LABELS[key]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.agingByClient.map((row) => (
              <TableRow key={row.clientId}>
                <TableCell>
                  <Link
                    to={`/clients/${row.clientId}`}
                    className="hover:underline"
                  >
                    {row.clientName}
                  </Link>
                </TableCell>
                {AGING_BUCKETS.map((key) => (
                  <TableCell key={key} className="text-right">
                    {cell(row.buckets, key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell>Total</TableCell>
              {AGING_BUCKETS.map((key) => (
                <TableCell
                  key={key}
                  className="text-right"
                  data-testid={`aging-${data.currency}-${key}`}
                >
                  {cell(data.aging, key)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function CurrencySection({
  data,
  yearLabel,
}: {
  data: CurrencyDashboardDto
  yearLabel: string
}) {
  const { currency } = data
  return (
    <section className="space-y-4" aria-label={`${currency} overview`}>
      <h2 className="text-sm font-medium text-muted-foreground">{currency}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          testId={`outstanding-${currency}`}
          label="Outstanding"
          value={money(data.outstandingMinor, currency)}
        />
        <Stat
          testId={`overdue-${currency}`}
          label="Overdue"
          value={money(data.overdueMinor, currency)}
          hint={`${data.overdueCount} invoice${data.overdueCount === 1 ? "" : "s"}`}
        />
        <Stat
          testId={`paid-month-${currency}`}
          label="Paid this month"
          value={money(data.paidThisMonthMinor, currency)}
        />
        <Stat
          testId={`paid-year-${currency}`}
          label={`Paid ${yearLabel}`}
          value={money(data.paidThisYearMinor, currency)}
        />
        <Stat
          testId={`drafts-${currency}`}
          label="Drafts"
          value={String(data.draftsCount)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <AgingTable data={data} />
        <Card>
          <CardHeader>
            <CardTitle>Top clients by outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing outstanding.
              </p>
            ) : (
              <ol className="space-y-2 text-sm">
                {data.topClients.map((c) => (
                  <li key={c.clientId} className="flex justify-between gap-3">
                    <Link
                      to={`/clients/${c.clientId}`}
                      className="truncate hover:underline"
                    >
                      {c.clientName}
                    </Link>
                    <span className="font-medium tabular-nums">
                      {money(c.outstandingMinor, currency)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export function DashboardPage() {
  const dashboard = useDashboard()
  const data = dashboard.data
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Dashboard"
        description={data ? `As of ${shortDate(data.today)}` : undefined}
        actions={
          <Button render={<Link to="/invoices/new" />} nativeButton={false}>
            <Icon icon={Add01Icon} /> New invoice
          </Button>
        }
      />
      {dashboard.isPending && <Skeleton className="h-64 w-full" />}
      {data && data.currencies.length === 0 && (
        <EmptyState
          title="Nothing to show yet"
          hint="Create an invoice and your totals appear here."
          action={
            <Button render={<Link to="/invoices/new" />} nativeButton={false}>
              Create an invoice
            </Button>
          }
        />
      )}
      {data?.currencies.map((c) => (
        <CurrencySection key={c.currency} data={c} yearLabel={data.yearLabel} />
      ))}
      {data && data.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.recent.map((row) => (
                <li key={row.id}>
                  <Link
                    to={`/invoices/${row.id}`}
                    className="-mx-2 flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-accent/40"
                  >
                    <span className="w-32 font-medium tabular-nums">
                      {row.number}
                    </span>
                    <span className="flex-1 truncate">{row.clientName}</span>
                    <StatusBadge
                      status={row.status}
                      overdue={
                        row.status === "ISSUED" &&
                        row.dueDate !== null &&
                        row.dueDate < data.today
                      }
                    />
                    <span className="w-32 text-right font-medium tabular-nums">
                      {money(row.totalMinor, row.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

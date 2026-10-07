import type { ActivityDto } from "@workspace/shared"
import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { EmptyState, PageHeader } from "@/components/PageHeader"
import { relativeTime } from "@/lib/format"
import { useActivity } from "@/lib/invoiceQueries"

function target(row: ActivityDto): string | null {
  if (row.invoiceId) return `/invoices/${row.invoiceId}`
  return row.clientId ? `/clients/${row.clientId}` : null
}

/** Everything that happened in the workspace, newest first, loaded one page at a time. */
export function ActivityPage() {
  const activity = useActivity()
  const rows = activity.data?.pages.flatMap((p) => p.rows) ?? []

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Activity"
        description="Every change to invoices and clients."
      />
      {activity.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => {
            const to = target(row)
            return (
              <li
                key={row.id}
                className="flex items-baseline gap-3 px-4 py-2.5 text-sm"
              >
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {relativeTime(row.at)}
                </span>
                {to ? (
                  <Link to={to} className="hover:underline">
                    {row.summary}
                  </Link>
                ) : (
                  <span>{row.summary}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {activity.hasNextPage && (
        <Button
          variant="outline"
          disabled={activity.isFetchingNextPage}
          onClick={() => void activity.fetchNextPage()}
        >
          {activity.isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  )
}

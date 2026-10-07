import { Add01Icon } from "@hugeicons/core-free-icons"
import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Icon } from "@/components/Icon"
import { EmptyState, PageHeader } from "@/components/PageHeader"
import { ClientFolders } from "@/features/clients/ClientFolders"
import { useInvoiceList } from "@/lib/invoiceQueries"
import { InvoiceFilters } from "./InvoiceFilters"
import { InvoiceTable } from "./InvoiceTable"
import { useListParams } from "./useListParams"
import { useRowActions } from "./useRowActions"

type Tab = "date" | "client" | "trash"
const TAB_KEY = "tab"

function InvoiceList({ trash }: { trash: boolean }) {
  const params = useListParams()
  const [byProfile, setByProfile] = useState(false)
  const query = useInvoiceList({
    ...params.filters,
    trash: trash ? "true" : undefined,
  })
  const { onAction, dialogs } = useRowActions(query.data?.today ?? "")
  const rows = useMemo(() => {
    const list = query.data?.rows ?? []
    return byProfile
      ? [...list].sort((a, b) => a.issuerName.localeCompare(b.issuerName))
      : list
  }, [query.data, byProfile])
  // Month headings only make sense when sorted by issue date.
  const sortedByDate =
    !params.filters.sort || params.filters.sort.startsWith("issueDate")
  const group = byProfile ? "profile" : sortedByDate ? "month" : "none"

  return (
    <div className="space-y-4">
      <InvoiceFilters
        params={params}
        groupByProfile={byProfile}
        onGroupByProfile={setByProfile}
      />
      {query.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            trash
              ? "The Trash is empty"
              : params.hasFilters
                ? "No invoices match these filters"
                : "No invoices yet"
          }
          hint={
            trash
              ? "Discarded drafts appear here and can be restored."
              : params.hasFilters
                ? "Try clearing a filter."
                : "Create your first invoice to see it here."
          }
          action={
            !trash &&
            !params.hasFilters && (
              <Button render={<Link to="/invoices/new" />} nativeButton={false}>
                New invoice
              </Button>
            )
          }
        />
      ) : (
        <InvoiceTable
          rows={rows}
          group={trash ? "none" : group}
          onAction={onAction}
        />
      )}
      {dialogs}
    </div>
  )
}

export function InvoicesPage() {
  const [search, setSearch] = useSearchParams()
  const tab = (search.get(TAB_KEY) as Tab | null) ?? "date"
  const select = (next: Tab) =>
    setSearch(next === "date" ? {} : { [TAB_KEY]: next }, { replace: true })

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Invoices"
        actions={
          <Button render={<Link to="/invoices/new" />} nativeButton={false}>
            <Icon icon={Add01Icon} /> New invoice
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(value) => select(value as Tab)}>
        <TabsList>
          <TabsTrigger value="date">By date</TabsTrigger>
          <TabsTrigger value="client">By client</TabsTrigger>
          <TabsTrigger value="trash">Trash</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "client" ? (
        <ClientFolders />
      ) : (
        <InvoiceList key={tab} trash={tab === "trash"} />
      )}
    </div>
  )
}

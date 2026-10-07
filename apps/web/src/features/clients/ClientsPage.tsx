import {
  Add01Icon,
  Archive02Icon,
  PencilEdit02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import type { ClientDto } from "@workspace/shared"
import { useMemo, useState } from "react"
import { Link } from "react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
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
import { EditSheet } from "@/components/form/EditSheet"
import { EmptyState, PageHeader } from "@/components/PageHeader"
import { shortDate } from "@/lib/format"
import { useArchiveClient, useClients } from "@/lib/queries"
import { ClientForm } from "./ClientForm"

export function ClientsPage() {
  const clients = useClients()
  const archive = useArchiveClient()
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<ClientDto | "new" | null>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (clients.data ?? [])
      .filter((c) => (showArchived ? true : !c.archivedAt))
      .filter(
        (c) =>
          q === "" ||
          c.name.toLowerCase().includes(q) ||
          (c.contactPerson ?? "").toLowerCase().includes(q)
      )
  }, [clients.data, search, showArchived])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Clients"
        description="Each client is a folder of invoices."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Icon icon={Add01Icon} /> New client
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Icon
            icon={Search01Icon}
            className="absolute top-2.5 left-2.5 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Search clients"
            placeholder="Search clients"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showArchived ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      </div>
      {clients.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={search ? "No clients match your search" : "No clients yet"}
          hint="Add a client to start invoicing."
          action={
            !search && (
              <Button onClick={() => setEditing("new")}>New client</Button>
            )
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="hidden md:table-cell">
                  Last invoice
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((client) => (
                <TableRow
                  key={client.id}
                  className={client.archivedAt ? "opacity-60" : undefined}
                >
                  <TableCell className="font-medium">
                    <Link
                      to={`/clients/${client.id}`}
                      className="hover:underline"
                    >
                      {client.name}
                    </Link>
                    {client.archivedAt && (
                      <Badge variant="outline" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {client.contactPerson ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {client.summary?.invoiceCount ?? 0}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {shortDate(client.summary?.lastInvoiceDate ?? null)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${client.name}`}
                      onClick={() => setEditing(client)}
                    >
                      <Icon icon={PencilEdit02Icon} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        client.archivedAt
                          ? `Restore ${client.name}`
                          : `Archive ${client.name}`
                      }
                      onClick={() =>
                        archive.mutate({
                          id: client.id,
                          archived: Boolean(client.archivedAt),
                        })
                      }
                    >
                      <Icon icon={Archive02Icon} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <EditSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "New client" : "Edit client"}
      >
        {editing !== null && (
          <ClientForm
            key={editing === "new" ? "new" : editing.id}
            client={editing === "new" ? undefined : editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </EditSheet>
    </div>
  )
}

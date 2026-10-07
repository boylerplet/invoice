import { Search01Icon } from "@hugeicons/core-free-icons"
import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Icon } from "@/components/Icon"
import { SelectField } from "@/components/form/SelectField"
import { useClients, useProfiles } from "@/lib/queries"
import type { useListParams } from "./useListParams"

const ALL = "all"

const STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ISSUED", label: "Issued" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
]

const SORT_OPTIONS = [
  { value: "issueDate_desc", label: "Newest first" },
  { value: "issueDate_asc", label: "Oldest first" },
  { value: "total_desc", label: "Highest total" },
  { value: "total_asc", label: "Lowest total" },
  { value: "due_asc", label: "Due soonest" },
  { value: "number_desc", label: "Number, high to low" },
]

type Params = ReturnType<typeof useListParams>

interface Props {
  params: Params
  /** Hide the client filter on a client's own page. */
  hideClient?: boolean
  groupByProfile?: boolean
  onGroupByProfile?: (on: boolean) => void
}

/** Search and filters for invoice lists. Every control writes to the URL. */
export function InvoiceFilters({ params, hideClient, groupByProfile, onGroupByProfile }: Props) {
  const { filters, set, clear, hasFilters } = params
  const clients = useClients()
  const profiles = useProfiles()
  const [text, setText] = useState(filters.q ?? "")

  useEffect(() => {
    if ((filters.q ?? "") === text) return
    const timer = setTimeout(() => set({ q: text }), 250)
    return () => clearTimeout(timer)
  }, [text, filters.q, set])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Icon icon={Search01Icon} className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
        <Input aria-label="Search invoices" placeholder="Search number, client or reference" className="pl-8" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <SelectField id="filter-status" className="w-36" value={filters.status ?? ALL} options={STATUS_OPTIONS} onChange={(v) => set({ status: v === ALL ? undefined : v })} />
      {!hideClient && (
        <SelectField
          id="filter-client"
          className="w-44"
          value={filters.clientId ?? ALL}
          options={[{ value: ALL, label: "All clients" }, ...(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
          onChange={(v) => set({ clientId: v === ALL ? undefined : v })}
        />
      )}
      <SelectField
        id="filter-profile"
        className="w-44"
        value={filters.profileId ?? ALL}
        options={[{ value: ALL, label: "All profiles" }, ...(profiles.data ?? []).map((p) => ({ value: p.id, label: p.displayName }))]}
        onChange={(v) => set({ profileId: v === ALL ? undefined : v })}
      />
      <SelectField className="w-28" value={filters.currency ?? ALL} options={[{ value: ALL, label: "Any currency" }, { value: "INR", label: "INR" }, { value: "USD", label: "USD" }]} onChange={(v) => set({ currency: v === ALL ? undefined : v })} />
      <Input aria-label="Issued from" type="date" className="w-36" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
      <Input aria-label="Issued to" type="date" className="w-36" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
      <SelectField className="w-40" value={filters.sort ?? "issueDate_desc"} options={SORT_OPTIONS} onChange={(v) => set({ sort: v === "issueDate_desc" ? undefined : v })} />
      {onGroupByProfile && (
        <Button type="button" variant={groupByProfile ? "secondary" : "ghost"} size="sm" onClick={() => onGroupByProfile(!groupByProfile)}>
          Group by profile
        </Button>
      )}
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => { setText(""); clear() }}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

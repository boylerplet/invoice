import { Search01Icon } from "@hugeicons/core-free-icons"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandDialog } from "@workspace/ui/components/command"
import { Icon } from "@/components/Icon"
import { money } from "@/lib/format"
import { useInvoiceList } from "@/lib/invoiceQueries"
import { useClients } from "@/lib/queries"

/** Ctrl/Cmd+K: jump to an invoice by number or client name, or to a client folder. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const invoices = useInvoiceList({})
  const clients = useClients()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      <Button variant="outline" size="sm" className="text-muted-foreground w-44 justify-start" onClick={() => setOpen(true)}>
        <Icon icon={Search01Icon} /> Search...
        <kbd className="bg-muted ml-auto rounded px-1.5 text-[10px]">Ctrl K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump to an invoice or client">
        <Command>
          <CommandInput placeholder="Invoice number or client name" />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup heading="Invoices">
              {(invoices.data?.rows ?? []).slice(0, 200).map((row) => (
                <CommandItem key={row.id} value={`${row.number} ${row.clientName}`} onSelect={() => go(`/invoices/${row.id}`)}>
                  <span className="font-medium tabular-nums">{row.number}</span>
                  <span className="text-muted-foreground truncate">{row.clientName}</span>
                  <span className="ml-auto tabular-nums">{money(row.totalMinor, row.currency)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Clients">
              {(clients.data ?? []).filter((c) => !c.archivedAt).map((client) => (
                <CommandItem key={client.id} value={`client ${client.name}`} onSelect={() => go(`/clients/${client.id}`)}>
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

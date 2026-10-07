import { addDays } from "./dates"
import type { ClientDto, IssuerProfileDto, PaymentAccountDto } from "./dto"
import type { Adjustment, Child, ClientSnapshot, InvoiceDoc, IssuerSnapshot, Item, PaymentSnapshot } from "./schema"
import { MAX_CHILDREN, MAX_ITEMS } from "./schema"

/** Pure helpers the editor uses to change an invoice document without mutating it. */

export type IdFactory = () => string
const uuid: IdFactory = () => crypto.randomUUID()

export const blankItem = (id: IdFactory = uuid): Item => ({
  id: id(),
  description: "",
  detail: null,
  pricing: "explicit",
  qty: null,
  unit: null,
  rate: null,
  children: [],
})

export const blankChild = (id: IdFactory = uuid): Child => ({ id: id(), description: "", qty: null, unit: null, rate: null })

export const blankAdjustment = (kind: Adjustment["kind"] = "discount", id: IdFactory = uuid): Adjustment => ({
  id: id(),
  label: kind === "discount" ? "Discount" : "Extra charge",
  kind,
  valueType: "percent",
  value: "0",
})

export function cloneItem(item: Item, id: IdFactory = uuid): Item {
  return { ...item, id: id(), children: item.children.map((c) => ({ ...c, id: id() })) }
}

/** Moves one element; returns the same array when the move is a no-op or out of range. */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list]
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) next.splice(to, 0, moved)
  return next
}

export const canAddItem = (doc: Pick<InvoiceDoc, "items">): boolean => doc.items.length < MAX_ITEMS
export const canAddChild = (item: Pick<Item, "children">): boolean => item.children.length < MAX_CHILDREN

/** Removing the last item would leave an invalid invoice, so one blank item always stays. */
export function removeItem(items: readonly Item[], id: string, ids: IdFactory = uuid): Item[] {
  const next = items.filter((item) => item.id !== id)
  return next.length > 0 ? next : [blankItem(ids)]
}

export const dueDateFromDays = (issueDate: string, days: number): string => addDays(issueDate, days)

export function issuerSnapshot(profile: IssuerProfileDto): IssuerSnapshot {
  return {
    profileId: profile.id,
    displayName: profile.displayName,
    legalName: profile.legalName,
    addressLines: profile.addressLines,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    taxIds: profile.taxIds,
    logoFile: profile.logoFile,
  }
}

export function clientSnapshot(client: ClientDto): ClientSnapshot {
  return {
    clientId: client.id,
    name: client.name,
    contactPerson: client.contactPerson,
    addressLines: client.addressLines,
    email: client.email,
    phone: client.phone,
    taxIds: client.taxIds,
  }
}

export function paymentSnapshot(account: PaymentAccountDto, title = "Payment details"): PaymentSnapshot {
  return { accountId: account.id, title, lines: account.lines }
}

/** The account to suggest for an invoice: the client's, then the profile's, matching the invoice currency. */
export function suggestPaymentAccount(
  accounts: readonly PaymentAccountDto[],
  currency: InvoiceDoc["currency"],
  preferredIds: readonly (string | null | undefined)[],
  profileId: string
): PaymentAccountDto | undefined {
  const usable = accounts.filter((a) => !a.archivedAt && a.currency === currency && (a.issuerProfileId === null || a.issuerProfileId === profileId))
  for (const id of preferredIds) {
    const hit = usable.find((a) => a.id === id)
    if (hit) return hit
  }
  return usable[0]
}

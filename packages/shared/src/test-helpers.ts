import type { Adjustment, Child, InvoiceDoc, Item } from "./schema"

let seq = 0
const id = () => `id-${++seq}`

export function item(over: Partial<Item> = {}): Item {
  return {
    id: id(),
    description: "Item",
    detail: null,
    pricing: "explicit",
    qty: null,
    unit: null,
    rate: 100_00,
    children: [],
    ...over,
  }
}

export function child(over: Partial<Child> = {}): Child {
  return {
    id: id(),
    description: "Child",
    qty: null,
    unit: null,
    rate: null,
    ...over,
  }
}

export function adjustment(over: Partial<Adjustment> = {}): Adjustment {
  return {
    id: id(),
    label: "Adjustment",
    kind: "discount",
    valueType: "fixed",
    value: "0",
    ...over,
  }
}

export function doc(over: Partial<InvoiceDoc> = {}): InvoiceDoc {
  return {
    schemaVersion: 1,
    type: "INVOICE",
    number: "INV-2026-0001",
    issueDate: "2026-04-15",
    dueDate: "2026-04-30",
    currency: "INR",
    reference: null,
    paymentTerms: null,
    issuer: {
      profileId: "p1",
      displayName: "Studio",
      legalName: null,
      addressLines: [],
      email: null,
      phone: null,
      website: null,
      taxIds: [],
      logoFile: null,
    },
    client: {
      clientId: "c1",
      name: "Client",
      contactPerson: null,
      addressLines: [],
      email: null,
      phone: null,
      taxIds: [],
    },
    payment: null,
    items: [item()],
    adjustments: [],
    tax: { enabled: false, label: "GST", rate: "18" },
    notes: null,
    presentation: { templateId: "studio", templateVersion: 1, paperSize: "A4" },
    ...over,
  }
}

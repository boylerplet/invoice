import type {
  Adjustment,
  Child,
  InvoiceDoc,
  Item,
  PaymentSnapshot,
} from "@workspace/shared"

/** Inline SVG so fixtures never touch the network or the uploads folder. */
export const FIXTURE_LOGO_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="168" height="56" viewBox="0 0 168 56"><rect width="56" height="56" rx="12" fill="#111111"/><path d="M14 40V16l14 16 14-16v24" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><text x="68" y="36" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#111111">Menon</text></svg>'
)}`

/** Deterministic ids: the same fixture always produces the same document. */
export function idFactory(prefix: string): () => string {
  let n = 0
  return () => `${prefix}-${++n}`
}

export interface Ids {
  next: () => string
}

export function item(
  ids: Ids,
  over: Partial<Item> & Pick<Item, "description">
): Item {
  return {
    id: ids.next(),
    detail: null,
    pricing: "explicit",
    qty: null,
    unit: null,
    rate: 0,
    children: [],
    ...over,
  }
}

export function child(
  ids: Ids,
  over: Partial<Child> & Pick<Child, "description">
): Child {
  return { id: ids.next(), qty: null, unit: null, rate: null, ...over }
}

export function adjustment(
  ids: Ids,
  over: Partial<Adjustment> & Pick<Adjustment, "label">
): Adjustment {
  return {
    id: ids.next(),
    kind: "discount",
    valueType: "fixed",
    value: "0",
    ...over,
  }
}

export const PAYMENT: PaymentSnapshot = {
  accountId: "fx-account",
  title: "Payment details",
  lines: [
    { label: "A/C holder", value: "Menon Design Co." },
    { label: "A/C number", value: "50200012345678" },
    { label: "IFSC", value: "HDFC0001234" },
    { label: "Bank", value: "HDFC Bank, Indiranagar, Bengaluru" },
    { label: "UPI", value: "menondesign@hdfcbank" },
  ],
}

export const USD_PAYMENT: PaymentSnapshot = {
  accountId: "fx-account-usd",
  title: "Payment details",
  lines: [
    { label: "Beneficiary", value: "Menon Design Co." },
    { label: "Account", value: "00123456789" },
    { label: "SWIFT", value: "HDFCINBBXXX" },
    { label: "Bank", value: "HDFC Bank, Bengaluru, India" },
  ],
}

export function baseDoc(over: Partial<InvoiceDoc> = {}): InvoiceDoc {
  return {
    schemaVersion: 1,
    type: "INVOICE",
    number: "INV-2026-0042",
    issueDate: "2026-04-15",
    dueDate: "2026-04-30",
    currency: "INR",
    reference: "PO-7731",
    paymentTerms: "Due within 15 days",
    issuer: {
      profileId: "fx-profile",
      displayName: "Menon Design Co.",
      legalName: "Menon Design Company LLP",
      addressLines: [
        "14, 3rd Cross, Indiranagar",
        "Bengaluru 560038, Karnataka",
      ],
      email: "hello@menondesign.example",
      phone: "+91 98450 00000",
      website: null,
      taxIds: [{ label: "GSTIN", value: "29ABCDE1234F1Z5" }],
      logoFile: "fixture-logo",
    },
    client: {
      clientId: "fx-client",
      name: "Kaveri Automation Pvt Ltd",
      contactPerson: "Ananya Rao",
      addressLines: [
        "Plot 22, Peenya Industrial Area",
        "Bengaluru 560058, Karnataka",
      ],
      email: "accounts@kaveri.example",
      phone: "+91 80 4000 0000",
      taxIds: [{ label: "GSTIN", value: "29AAACK5678M1Z2" }],
    },
    payment: null,
    items: [],
    adjustments: [],
    tax: { enabled: false, label: "GST", rate: "18" },
    notes: null,
    presentation: { templateId: "studio", templateVersion: 1, paperSize: "A4" },
    ...over,
  }
}

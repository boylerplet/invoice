import type { InvoiceDoc } from "@workspace/shared"
import { adjustment, baseDoc, child, idFactory, item, PAYMENT, USD_PAYMENT } from "./builders"

export { FIXTURE_LOGO_URL } from "./builders"

export interface Fixture {
  id: string
  title: string
  doc: InvoiceDoc
}

const ids = (prefix: string) => ({ next: idFactory(prefix) })
const lakh = (rupees: number) => rupees * 100

function minimal(): InvoiceDoc {
  const i = ids("min")
  return baseDoc({ items: [item(i, { description: "Brand identity design", rate: lakh(85_000) })] })
}

function typical(): InvoiceDoc {
  const i = ids("typ")
  return baseDoc({
    items: [
      item(i, { description: "HMI dashboard UI design", detail: "Operator console, 24 screens", qty: "24", unit: "screens", rate: lakh(3_500) }),
      item(i, { description: "Design system and component library", rate: lakh(60_000) }),
      item(i, { description: "Frontend build in React", qty: "62.5", unit: "hrs", rate: lakh(1_800) }),
      item(i, { description: "API integration", qty: "18", unit: "hrs", rate: lakh(2_000) }),
      item(i, { description: "QA and accessibility pass", qty: "12", unit: "hrs", rate: lakh(1_500) }),
    ],
  })
}

function withNotesAndPayment(): InvoiceDoc {
  const i = ids("pay")
  return baseDoc({
    items: [
      item(i, { description: "Monthly design retainer", detail: "April 2026", rate: lakh(75_000) }),
      item(i, { description: "Workshop: design systems for industrial software", qty: "1", unit: "day", rate: lakh(40_000) }),
    ],
    payment: PAYMENT,
    notes: "Thank you for your business.\nPlease quote the invoice number on your transfer. Late payments attract 1.5% interest per month.",
  })
}

function nestedPricedRollup(): InvoiceDoc {
  const i = ids("roll")
  return baseDoc({
    items: [
      item(i, {
        description: "Website redesign",
        detail: "Marketing site, 12 templates",
        pricing: "rollup",
        rate: null,
        children: [
          child(i, { description: "Discovery workshop", rate: lakh(25_000) }),
          child(i, { description: "UX wireframes", qty: "24", unit: "hrs", rate: lakh(2_000) }),
          child(i, { description: "Visual design", qty: "36", unit: "hrs", rate: lakh(2_500) }),
          child(i, { description: "Handover documentation", rate: lakh(10_000) }),
        ],
      }),
      item(i, {
        description: "Brand refresh",
        pricing: "rollup",
        rate: null,
        children: [
          child(i, { description: "Logo refinement", rate: lakh(30_000) }),
          child(i, { description: "Colour and type system", rate: lakh(20_000) }),
        ],
      }),
    ],
  })
}

function nestedDescriptiveExplicit(): InvoiceDoc {
  const i = ids("desc")
  return baseDoc({
    items: [
      item(i, {
        description: "Design system",
        pricing: "explicit",
        rate: lakh(150_000),
        children: [
          child(i, { description: "Foundations: colour, type, spacing" }),
          child(i, { description: "42 components with states" }),
          child(i, { description: "Documentation site" }),
        ],
      }),
      item(i, {
        description: "Discovery",
        pricing: "none",
        rate: null,
        children: [child(i, { description: "Stakeholder interviews" }), child(i, { description: "Competitive audit" })],
      }),
    ],
  })
}

function nestedMixed(): InvoiceDoc {
  const i = ids("mix")
  return baseDoc({
    items: [
      item(i, {
        description: "Mobile app, phase 1",
        pricing: "rollup",
        rate: null,
        children: [
          child(i, { description: "Information architecture", rate: lakh(40_000) }),
          child(i, { description: "Included at no charge: kickoff call" }),
          child(i, { description: "Screens", qty: "18.5", unit: "hrs", rate: lakh(2_800) }),
          child(i, { description: "Included at no charge: design QA" }),
        ],
      }),
      item(i, { description: "Hosting setup", rate: lakh(8_000) }),
    ],
  })
}

function flatNoQty(): InvoiceDoc {
  const i = ids("flat")
  return baseDoc({
    items: [
      item(i, { description: "Logo design", rate: lakh(45_000) }),
      item(i, { description: "Business card design", rate: lakh(12_000) }),
      item(i, { description: "Brand guidelines (PDF)", rate: lakh(30_000) }),
    ],
  })
}

const LONG = "Design and prototyping of the operator HMI for the packaging line, including alarm handling, recipe management and shift handover flows with full documentation"

function longDescriptions(): InvoiceDoc {
  const i = ids("long")
  return baseDoc({
    items: Array.from({ length: 6 }, (_, n) =>
      item(i, {
        description: `${LONG} (part ${n + 1})`,
        detail: "Delivered as Figma files with annotated specs and an interactive prototype for stakeholder review. Includes two rounds of revisions and a handover call with the engineering team.",
        qty: String(n + 2),
        unit: "weeks",
        rate: lakh(25_000),
      })
    ),
    notes: "Rates are inclusive of one revision round per milestone.",
  })
}

function fortyItems(): InvoiceDoc {
  const i = ids("forty")
  const names = ["Wireframes", "Visual design", "Prototype", "User testing", "Frontend build", "API integration", "QA", "Accessibility audit"]
  return baseDoc({
    items: Array.from({ length: 42 }, (_, n) =>
      item(i, {
        description: `${names[n % names.length]} — module ${Math.floor(n / names.length) + 1}`,
        detail: n % 5 === 0 ? "Reviewed with the client before sign-off." : null,
        qty: n % 3 === 0 ? null : String(4 + (n % 7)),
        unit: n % 3 === 0 ? null : "hrs",
        rate: lakh(1_200 + (n % 6) * 150),
      })
    ),
    payment: PAYMENT,
    notes: "Payable by NEFT or UPI.",
    tax: { enabled: true, label: "GST", rate: "18" },
  })
}

function bigGroup(): InvoiceDoc {
  const i = ids("big")
  return baseDoc({
    items: [
      item(i, { description: "Discovery and research", rate: lakh(50_000) }),
      item(i, {
        description: "Platform redesign — full scope",
        detail: "Every screen of the operator and admin consoles",
        pricing: "rollup",
        rate: null,
        children: Array.from({ length: 20 }, (_, n) =>
          child(i, { description: `Screen group ${n + 1}: layouts, states and edge cases`, qty: n % 2 === 0 ? String(6 + n) : null, unit: n % 2 === 0 ? "hrs" : null, rate: n % 4 === 3 ? null : lakh(2_200) })
        ),
      }),
      item(i, { description: "Handover", rate: lakh(15_000) }),
    ],
  })
}

function taxAndAdjustments(): InvoiceDoc {
  const i = ids("tax")
  return baseDoc({
    items: [
      item(i, { description: "Product design sprint", qty: "5", unit: "days", rate: lakh(30_000) }),
      item(i, { description: "Prototype hosting", rate: lakh(6_000) }),
    ],
    adjustments: [
      adjustment(i, { label: "Early payment discount", kind: "discount", valueType: "percent", value: "5" }),
      adjustment(i, { label: "Expedite charge", kind: "charge", valueType: "fixed", value: String(lakh(10_000)) }),
    ],
    tax: { enabled: true, label: "GST", rate: "18" },
    payment: PAYMENT,
    notes: "Discount applies if paid within 7 days.",
  })
}

function usdLetter(): InvoiceDoc {
  const i = ids("usd")
  return baseDoc({
    number: "INV-2026-0043",
    currency: "USD",
    issuer: { ...baseDoc().issuer, taxIds: [] },
    client: {
      clientId: "fx-client-usd",
      name: "Holloway Robotics Inc.",
      contactPerson: "Dana Holloway",
      addressLines: ["1200 Congress Ave, Suite 400", "Austin, TX 78701, USA"],
      email: "ap@holloway.example",
      phone: null,
      taxIds: [{ label: "EIN", value: "12-3456789" }],
    },
    items: [
      item(i, { description: "Robot fleet dashboard UX", qty: "40", unit: "hrs", rate: 9_500 }),
      item(i, { description: "Design system", rate: 420_000 }),
      item(i, { description: "Frontend implementation", qty: "55", unit: "hrs", rate: 10_500 }),
    ],
    payment: USD_PAYMENT,
    paymentTerms: "Net 30",
    notes: "Wire fees are borne by the sender.",
    presentation: { templateId: "studio", templateVersion: 1, paperSize: "LETTER" },
  })
}

function noDueNoReference(): InvoiceDoc {
  const i = ids("nodue")
  return baseDoc({
    dueDate: null,
    reference: null,
    paymentTerms: null,
    items: [item(i, { description: "Consulting call", qty: "2", unit: "hrs", rate: lakh(4_000) })],
  })
}

/** Row count tuned so the totals block just fails to fit under the last row on A4. */
function terminalJustOverflows(): InvoiceDoc {
  const i = ids("edge")
  return baseDoc({
    items: Array.from({ length: 13 }, (_, n) => item(i, { description: `Line item ${n + 1}`, qty: "3", unit: "hrs", rate: lakh(1_500) })),
    payment: PAYMENT,
    notes: "Totals sit right at the page boundary in this scenario.",
  })
}

function maxLength(): InvoiceDoc {
  const i = ids("max")
  const text = (n: number, seed: string) => (seed.repeat(Math.ceil(n / seed.length))).slice(0, n)
  return baseDoc({
    reference: text(80, "PO-REF-"),
    paymentTerms: text(200, "Payment due within thirty days of the invoice date. "),
    issuer: {
      ...baseDoc().issuer,
      displayName: text(60, "Menon Design "),
      legalName: text(100, "Menon Design Company Limited Liability Partnership "),
      addressLines: Array.from({ length: 4 }, (_, n) => text(80, `Address line ${n + 1} with a very long street name `)),
    },
    client: {
      ...baseDoc().client,
      name: text(90, "Kaveri Automation Private Limited "),
      contactPerson: text(80, "Ananya Rao-Subramanian "),
      addressLines: Array.from({ length: 4 }, (_, n) => text(80, `Client address ${n + 1} industrial estate `)),
    },
    items: Array.from({ length: 3 }, (_, n) =>
      item(i, {
        description: text(200, `Item ${n + 1} description that is deliberately long. `),
        detail: text(300, "Extra detail line that keeps going and going. "),
        qty: "999999.999",
        unit: "units",
        rate: lakh(99_999),
        children: [],
      })
    ),
    payment: PAYMENT,
    notes: text(800, "Note text that fills the maximum allowed length for this field. "),
    tax: { enabled: true, label: "Goods and services tax", rate: "28" },
  })
}

export const fixtures: Fixture[] = [
  { id: "minimal-1-item", title: "Minimal, one item", doc: minimal() },
  { id: "typical-5-items", title: "Typical, five items", doc: typical() },
  { id: "with-notes-and-payment", title: "Notes and payment details", doc: withNotesAndPayment() },
  { id: "nested-priced-rollup", title: "Rollup with priced children", doc: nestedPricedRollup() },
  { id: "nested-descriptive-explicit", title: "Descriptive children", doc: nestedDescriptiveExplicit() },
  { id: "nested-mixed-priced-unpriced", title: "Mixed priced and unpriced children", doc: nestedMixed() },
  { id: "flat-no-qty", title: "Flat charges, no quantity", doc: flatNoQty() },
  { id: "long-descriptions", title: "Long descriptions", doc: longDescriptions() },
  { id: "forty-items-multipage", title: "Forty items, multiple pages", doc: fortyItems() },
  { id: "big-group-spanning-pages", title: "Large group spanning pages", doc: bigGroup() },
  { id: "tax-and-adjustments", title: "Tax and adjustments", doc: taxAndAdjustments() },
  { id: "usd-letter", title: "USD on Letter", doc: usdLetter() },
  { id: "no-due-date-no-reference", title: "No due date, no reference", doc: noDueNoReference() },
  { id: "terminal-just-overflows-page", title: "Totals just overflow the page", doc: terminalJustOverflows() },
  { id: "max-length-fields", title: "Maximum length fields", doc: maxLength() },
]

export function getFixture(id: string): Fixture | undefined {
  return fixtures.find((f) => f.id === id)
}

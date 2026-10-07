/**
 * pnpm tsx scripts/qa-pdf.ts [scenario] [A4|LETTER]
 * Creates an invoice from a fixture on a running server (QA_BASE) and saves its PDF to .qa-shots/.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { request } from "@playwright/test"
import { fixtures } from "../packages/templates/fixtures/index"

const BASE = process.env.QA_BASE ?? "http://localhost:5173"
const scenario = process.argv[2] ?? "typical-5-items"
const paper = process.argv[3] === "LETTER" ? "LETTER" : "A4"
const fixture = fixtures.find((f) => f.id === scenario)
if (!fixture) throw new Error(`Unknown scenario ${scenario}`)

const api = await request.newContext({
  baseURL: BASE,
  extraHTTPHeaders: { Origin: BASE },
})
await api.post("/api/auth/login", {
  data: { username: "demo", password: "demo1234" },
})
const json = async <T>(res: Awaited<ReturnType<typeof api.get>>) =>
  (await res.json()) as T

const clients = await json<{ id: string }[]>(await api.get("/api/clients"))
let clientId = clients[0]?.id
if (!clientId) {
  const profile = await json<{ id: string }>(
    await api.post("/api/issuer-profiles", {
      data: {
        displayName: "Menon Design Co.",
        legalName: "Menon Design Company LLP",
        addressLines: ["14, 3rd Cross, Indiranagar", "Bengaluru 560038"],
        email: "hello@menondesign.example",
        phone: "+91 98450 00000",
        website: null,
        taxIds: [{ label: "GSTIN", value: "29ABCDE1234F1Z5" }],
        defaultPaymentAccountId: null,
        isDefault: true,
      },
    })
  )
  clientId = (
    await json<{ id: string }>(
      await api.post("/api/clients", {
        data: {
          name: "Kaveri Automation Pvt Ltd",
          contactPerson: "Ananya Rao",
          addressLines: ["Plot 22, Peenya", "Bengaluru 560058"],
          email: null,
          phone: null,
          taxIds: [],
          defaultIssuerProfileId: profile.id,
          defaultPaymentAccountId: null,
          defaultCurrency: null,
          defaultDueDays: null,
          notes: null,
        },
      })
    )
  ).id
}
const created = await json<{ id: string; doc: Record<string, unknown> }>(
  await api.post("/api/invoices", { data: { clientId } })
)
await api.put(`/api/invoices/${created.id}`, {
  data: {
    doc: {
      ...created.doc,
      items: fixture.doc.items,
      adjustments: fixture.doc.adjustments,
      tax: fixture.doc.tax,
      notes: fixture.doc.notes,
      payment: fixture.doc.payment,
      reference: fixture.doc.reference,
      presentation: {
        ...(created.doc.presentation as object),
        paperSize: paper,
      },
    },
  },
})
const pdf = await api.get(`/api/invoices/${created.id}/pdf?issue=false`, {
  timeout: 90_000,
})
if (!pdf.ok()) throw new Error(await pdf.text())
mkdirSync(resolve(".qa-shots"), { recursive: true })
const file = resolve(".qa-shots", `${scenario}-${paper}.pdf`)
writeFileSync(file, await pdf.body())
console.log(`saved ${file}`)

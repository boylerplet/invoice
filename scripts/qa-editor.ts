/**
 * pnpm tsx scripts/qa-editor.ts
 * Creates a client and a few invoices through the API of a running dev/e2e server and screenshots the editor.
 * QA_BASE (default http://localhost:5173) must serve the web app and proxy /api; the `demo` user must exist.
 */
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { request } from "@playwright/test"
import { fixtures } from "../packages/templates/fixtures/index"
import { launchBrowser } from "./browser"

const BASE = process.env.QA_BASE ?? "http://localhost:5173"
const api = await request.newContext({
  baseURL: BASE,
  extraHTTPHeaders: { Origin: BASE },
})
await api.post("/api/auth/login", {
  data: { username: "demo", password: "demo1234" },
})
const post = async <T>(path: string, data: unknown) =>
  (await (await api.post(`/api/${path}`, { data })).json()) as T

const profile = await post<{ id: string }>("issuer-profiles", {
  displayName: "Menon Design Co.",
  legalName: "Menon Design Company LLP",
  addressLines: ["14, 3rd Cross, Indiranagar", "Bengaluru 560038"],
  email: "hello@menondesign.example",
  phone: "+91 98450 00000",
  website: null,
  taxIds: [{ label: "GSTIN", value: "29ABCDE1234F1Z5" }],
  defaultPaymentAccountId: null,
  isDefault: true,
})
const account = await post<{ id: string }>("payment-accounts", {
  issuerProfileId: null,
  label: "HDFC current",
  currency: "INR",
  kind: "bank",
  lines: [
    { label: "A/C holder", value: "Menon Design Co." },
    { label: "A/C number", value: "50200012345678" },
    { label: "IFSC", value: "HDFC0001234" },
  ],
})
const client = await post<{ id: string }>("clients", {
  name: "Kaveri Automation Pvt Ltd",
  contactPerson: "Ananya Rao",
  addressLines: ["Plot 22, Peenya", "Bengaluru 560058"],
  email: "accounts@kaveri.example",
  phone: null,
  taxIds: [{ label: "GSTIN", value: "29AAACK5678M1Z2" }],
  defaultIssuerProfileId: profile.id,
  defaultPaymentAccountId: account.id,
  defaultCurrency: null,
  defaultDueDays: null,
  notes: null,
})

interface Detail {
  id: string
  doc: Record<string, unknown>
}
const make = async (scenario: string) => {
  const created = await post<Detail>("invoices", { clientId: client.id })
  const fixture = fixtures.find((f) => f.id === scenario)!.doc
  const doc = {
    ...created.doc,
    items: fixture.items,
    adjustments: fixture.adjustments,
    tax: fixture.tax,
    notes: fixture.notes,
    reference: fixture.reference,
  }
  await api.put(`/api/invoices/${created.id}`, { data: { doc } })
  return created.id
}
const ids = {
  typical: await make("typical-5-items"),
  forty: await make("forty-items-multipage"),
  nested: await make("nested-mixed-priced-unpriced"),
}

const outDir = resolve(".qa-shots")
mkdirSync(outDir, { recursive: true })
const browser = await launchBrowser()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/login`)
  await page.getByLabel("Username").fill("demo")
  await page.getByLabel("Password").fill("demo1234")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(`${BASE}/`)
  for (const [name, id] of Object.entries(ids)) {
    await page.goto(`${BASE}/invoices/${id}`)
    await page.waitForFunction("window.__INVOICE_READY__ === true", undefined, {
      timeout: 30_000,
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: resolve(outDir, `editor-${name}.png`) })
    console.log(`saved editor-${name}.png`)
  }
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto(`${BASE}/invoices/${ids.typical}`)
  await page.waitForTimeout(800)
  await page.screenshot({ path: resolve(outDir, "editor-narrow.png") })
} finally {
  await browser.close()
}

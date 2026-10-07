import { expect, test, type APIRequestContext } from "@playwright/test"
import { PDFDocument } from "pdf-lib"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { fixtures } from "../packages/templates/fixtures/index"
import { apiAs, createInvoice, login, saveDoc, seedMasterData, type Seeded } from "./helpers"

test.describe.configure({ mode: "serial" })

const SCENARIOS = ["typical-5-items", "forty-items-multipage", "big-group-spanning-pages", "terminal-just-overflows-page"]
const PAPERS = { A4: { w: 595.28, h: 841.89 }, LETTER: { w: 612, h: 792 } } as const

let api: APIRequestContext
let seed: Seeded

test.beforeAll(async () => {
  api = await apiAs()
  seed = await seedMasterData(api, "pdf")
})

/** Text of every PDF page, with whitespace removed so spacing differences cannot matter. */
async function pdfPageTexts(bytes: Uint8Array): Promise<string[]> {
  const doc = await getDocument({ data: bytes.slice(), useSystemFonts: false, disableFontFace: true, verbosity: 0 }).promise
  const texts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    texts.push(content.items.map((item) => ("str" in item ? item.str : "")).join("").replace(/\s+/g, ""))
  }
  return texts
}

for (const scenario of SCENARIOS) {
  for (const paper of ["A4", "LETTER"] as const) {
    test(`${scenario} on ${paper}: the PDF has the same pages as the preview`, async ({ page }) => {
      test.setTimeout(120_000)
      const fixture = fixtures.find((f) => f.id === scenario)!.doc
      const draft = await createInvoice(api, seed.clientId)
      await saveDoc(api, draft.id, {
        ...draft.doc,
        items: fixture.items,
        adjustments: fixture.adjustments,
        tax: fixture.tax,
        notes: fixture.notes,
        payment: fixture.payment,
        reference: fixture.reference,
        presentation: { ...(draft.doc.presentation as object), paperSize: paper },
      })

      await login(page)
      await page.goto(`/invoices/${draft.id}`)
      const doc = page.getByTestId("preview-pages").locator(".tpl-doc")
      await expect(doc).toHaveAttribute("data-layout-status", "ready", { timeout: 30_000 })
      const previewTexts = await page.getByTestId("preview-pages").locator(".tpl-page").evaluateAll((pages) => pages.map((p) => (p as HTMLElement).innerText.replace(/\s+/g, "")))
      expect(await doc.getAttribute("data-overflow")).toBe("0")

      const res = await api.get(`/api/invoices/${draft.id}/pdf?issue=false`, { timeout: 90_000 })
      expect(res.status(), await res.text().catch(() => "")).toBe(200)
      expect(res.headers()["content-type"]).toBe("application/pdf")
      const bytes = new Uint8Array(await res.body())

      const pdf = await PDFDocument.load(bytes)
      expect(pdf.getPageCount()).toBe(previewTexts.length)
      for (const pdfPage of pdf.getPages()) {
        expect(pdfPage.getWidth()).toBeCloseTo(PAPERS[paper].w, 0)
        expect(pdfPage.getHeight()).toBeCloseTo(PAPERS[paper].h, 0)
      }

      const pdfTexts = await pdfPageTexts(bytes)
      expect(pdfTexts).toHaveLength(previewTexts.length)
      pdfTexts.forEach((text, i) => expect(text, `page ${i + 1} text`).toBe(previewTexts[i]))

      expect(Buffer.from(bytes).toString("latin1")).toContain("Inter")
      if (paper === "A4") expect(pdfTexts.join("")).toContain("₹")
    })
  }
}

test("exporting from the editor downloads the PDF; exporting a draft can issue it", async ({ page }) => {
  test.setTimeout(120_000)
  const draft = await createInvoice(api, seed.clientId)
  const doc = { ...draft.doc, items: [{ ...draft.doc.items[0], description: "Export test", rate: 123_400 }] }
  await saveDoc(api, draft.id, doc)
  await login(page)
  await page.goto(`/invoices/${draft.id}`)

  await page.getByRole("button", { name: "Export PDF" }).click()
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: "Export & mark as issued" }).click(),
  ])
  expect(download.suggestedFilename()).toBe(`${draft.number} - ${seed.clientName}.pdf`)
  await expect(page.getByText(/Saved INV|Saved ACME/)).toBeVisible()
  await expect(page.getByText("Issued", { exact: true }).first()).toBeVisible()
  const detail = await (await api.get(`/api/invoices/${draft.id}`)).json()
  expect(detail.status).toBe("ISSUED")
  expect(detail.revision).toBe(1)

  // An issued invoice downloads straight away.
  const [second] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.getByRole("button", { name: "Export PDF" }).click()])
  expect(second.suggestedFilename()).toContain(draft.number)
})

test("the print page rejects a missing or wrong token", async ({ page }) => {
  const draft = await createInvoice(api, seed.clientId)
  await page.goto(`/print/${draft.id}?token=nope`)
  await expect(page.getByText("This print link is invalid or has expired")).toBeVisible()
})

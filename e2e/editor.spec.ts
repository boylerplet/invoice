import { expect, test, type APIRequestContext } from "@playwright/test"
import { fixtures } from "../packages/templates/fixtures/index"
import { apiAs, createInvoice, login, saveDoc, seedMasterData, type Seeded } from "./helpers"

test.describe.configure({ mode: "serial" })

let api: APIRequestContext
let seed: Seeded

test.beforeAll(async () => {
  api = await apiAs()
  seed = await seedMasterData(api, "editor")
})

/** A draft with one priced item, ready to issue. */
async function pricedDraft(rate = 8_500_000) {
  const draft = await createInvoice(api, seed.clientId)
  const doc = { ...draft.doc, items: [{ ...draft.doc.items[0], description: "Brand identity design", rate }] }
  await saveDoc(api, draft.id, doc)
  return { ...draft, doc }
}

test("create a draft from a client, edit it and watch the preview update and autosave", async ({ page }) => {
  await login(page)
  await page.goto("/invoices/new")
  await page.locator("#new-client").click()
  await page.getByRole("option", { name: seed.clientName }).click()
  await page.getByRole("button", { name: "Create draft" }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)

  const preview = page.getByTestId("preview-pages")
  await expect(preview).toContainText(seed.clientName)
  await page.getByLabel("Description", { exact: true }).first().fill("Logo and brand identity")
  await page.getByLabel("Rate", { exact: true }).first().fill("85000")
  await expect(preview).toContainText("Logo and brand identity")
  await expect(preview).toContainText("85,000.00")
  await expect(preview).toContainText("₹85,000.00")
  await expect(page.getByRole("status").filter({ hasText: /Saved/ })).toBeVisible()

  await page.reload()
  await expect(page.getByTestId("preview-pages")).toContainText("Logo and brand identity")
})

test("a flat charge keeps the quantity empty and a quantity multiplies", async ({ page }) => {
  const draft = await pricedDraft(100_000)
  await login(page)
  await page.goto(`/invoices/${draft.id}`)
  const preview = page.getByTestId("preview-pages")
  await expect(preview).toContainText("1,000.00")
  await expect(preview).not.toContainText("Qty")
  await page.getByLabel("Quantity").first().fill("2.5")
  await page.getByLabel("Unit", { exact: true }).first().fill("hrs")
  await expect(preview).toContainText("2.5 hrs")
  await expect(preview).toContainText("2,500.00")
  await page.getByLabel("Quantity").first().fill("")
  await expect(preview).not.toContainText("hrs")
  await expect(preview).toContainText("1,000.00")
})

test("forty items paginate into several pages and zoom controls work", async ({ page }) => {
  const draft = await createInvoice(api, seed.clientId)
  const forty = fixtures.find((f) => f.id === "forty-items-multipage")!.doc
  await saveDoc(api, draft.id, { ...draft.doc, items: forty.items, payment: null })
  await login(page)
  await page.goto(`/invoices/${draft.id}`)
  await expect(page.getByTestId("preview-pages").locator(".tpl-page")).toHaveCount(3, { timeout: 20_000 })
  await expect(page.getByRole("button", { name: /Page \d of 3/ })).toBeVisible()

  const zoomLabel = page.locator("#zoom-select")
  await page.getByRole("button", { name: "100%" }).click()
  await expect(zoomLabel).toContainText("100%")
  await page.getByRole("button", { name: "Zoom in" }).click()
  await expect(zoomLabel).toContainText("125%")
  await page.getByRole("button", { name: "Zoom out" }).click()
  await page.getByRole("button", { name: "Zoom out" }).click()
  await expect(zoomLabel).toContainText("75%")
  await page.getByRole("button", { name: "Fit width" }).click()
  await expect(page.getByTestId("preview-pages").locator(".tpl-page")).toHaveCount(3)

  await page.getByTestId("preview-scroll").evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
  await expect(page.getByRole("button", { name: "Page 3 of 3" })).toBeVisible()
})

test("issue, edit with a revision, view history, mark paid (read-only) and reopen", async ({ page }) => {
  const draft = await pricedDraft()
  await login(page)
  await page.goto(`/invoices/${draft.id}`)

  await page.getByRole("button", { name: "Mark as issued" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark as issued" }).click()
  await expect(page.getByText("Invoice issued")).toBeVisible()
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled()

  await page.getByLabel("Rate", { exact: true }).first().fill("90000")
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled()
  await page.keyboard.press("Control+s")
  await page.getByLabel("What changed? (optional)").fill("Raised the rate")
  await page.getByRole("button", { name: "Save revision" }).click()
  await expect(page.getByText("Revision saved")).toBeVisible()

  await page.locator(`a[href$="/history"]`).click()
  await expect(page.getByRole("list", { name: "Revisions" }).getByRole("listitem")).toHaveCount(2)
  await expect(page.getByText("Raised the rate")).toBeVisible()
  await page.getByRole("button", { name: /Revision 1/ }).click()
  await expect(page.getByTestId("preview-pages")).toContainText("85,000.00")
  await page.getByText("Back to invoice").click()

  await page.getByRole("button", { name: "Mark paid" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark as paid" }).click()
  await expect(page.getByText(/Paid on/)).toBeVisible()
  await expect(page.getByLabel("Description", { exact: true }).first()).toBeDisabled()
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0)

  await page.getByRole("button", { name: "Reopen" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Reopen" }).click()
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible()
  await expect(page.getByLabel("Description", { exact: true }).first()).toBeEnabled()
})

test("issuing an incomplete draft shows what to fix", async ({ page }) => {
  const draft = await createInvoice(api, seed.clientId)
  await login(page)
  await page.goto(`/invoices/${draft.id}`)
  await page.getByRole("button", { name: "Mark as issued" }).click()
  await expect(page.getByText("Describe this item")).toBeVisible()
  await expect(page.getByText("Rate is required for a fixed amount")).toBeVisible()
})

test("cancel, duplicate and discard", async ({ page }) => {
  const draft = await pricedDraft()
  await login(page)
  await page.goto(`/invoices/${draft.id}`)
  await page.getByRole("button", { name: "Mark as issued" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark as issued" }).click()
  await expect(page.getByRole("button", { name: "Cancel invoice" })).toBeVisible()
  await page.getByRole("button", { name: "Cancel invoice" }).click()
  await page.getByLabel("Reason (optional)").fill("Sent twice")
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel invoice" }).click()
  await expect(page.getByText(/Cancelled: Sent twice/)).toBeVisible()

  await page.getByRole("button", { name: "Duplicate", exact: true }).click()
  await expect(page).not.toHaveURL(new RegExp(draft.id))
  await expect(page.getByRole("button", { name: "Mark as issued" })).toBeVisible()
  await page.getByRole("button", { name: "More actions" }).click()
  await page.getByRole("menuitem", { name: "Discard draft" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard draft" }).click()
  await expect(page).toHaveURL(/\/invoices$/)
})

test("an unrelated user cannot open someone else's invoice", async ({ page }) => {
  await login(page)
  await page.goto("/invoices/00000000-0000-4000-8000-000000000000")
  await expect(page.getByText("Invoice not found")).toBeVisible()
})

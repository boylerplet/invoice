import { execSync } from "node:child_process"
import { expect, test, type APIRequestContext } from "@playwright/test"
import { apiAs, createInvoice, login, saveDoc, seedMasterData, type Seeded } from "./helpers"

test.describe.configure({ mode: "serial" })

const USER = "lists"
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)

let api: APIRequestContext
let seed: Seeded
let second: Seeded
const numbers: Record<string, string> = {}

/** A priced invoice with an explicit due date, optionally issued and paid. */
async function make(key: string, clientId: string, rate: number, opts: { due: number; issue?: boolean; pay?: boolean; currency?: "USD" }) {
  const draft = await createInvoice(api, clientId)
  const doc = {
    ...draft.doc,
    currency: opts.currency ?? "INR",
    dueDate: iso(opts.due),
    items: [{ ...draft.doc.items[0], description: `Work ${key}`, rate }],
    payment: null,
  }
  await saveDoc(api, draft.id, doc)
  if (opts.issue) await api.post(`/api/invoices/${draft.id}/issue`)
  if (opts.pay) await api.post(`/api/invoices/${draft.id}/pay`, { data: { paidDate: iso(0), note: null } })
  numbers[key] = draft.number
  return draft.id
}

test.beforeAll(async () => {
  execSync(`pnpm --filter server exec tsx src/cli/user-create.ts --username ${USER} --password demo1234 --workspace "Lists Studio"`, {
    env: { ...process.env, DATA_DIR: "./.e2e-data" },
    stdio: "ignore",
  })
  api = await apiAs(USER)
  seed = await seedMasterData(api, "alpha")
  second = await seedMasterData(api, "beta")
  await make("not-due", seed.clientId, 1_000_000, { due: 10, issue: true })
  await make("overdue-20", seed.clientId, 2_000_000, { due: -20, issue: true })
  await make("overdue-75", seed.clientId, 4_000_000, { due: -75, issue: true })
  await make("paid", seed.clientId, 8_000_000, { due: -5, issue: true, pay: true })
  await make("draft", seed.clientId, 500_000, { due: 5 })
  await make("usd", second.clientId, 100_000, { due: -5, issue: true, currency: "USD" })
})

test("the dashboard totals, aging buckets and top clients match the data", async ({ page }) => {
  await login(page, USER)
  await expect(page.getByTestId("outstanding-INR")).toHaveText("₹70,000.00")
  await expect(page.getByTestId("overdue-INR")).toHaveText("₹60,000.00")
  await expect(page.getByTestId("paid-month-INR")).toHaveText("₹80,000.00")
  await expect(page.getByTestId("paid-year-INR")).toHaveText("₹80,000.00")
  await expect(page.getByTestId("drafts-INR")).toHaveText("1")
  await expect(page.getByTestId("aging-INR-notDue")).toContainText("₹10,000.00")
  await expect(page.getByTestId("aging-INR-1-30")).toContainText("₹20,000.00")
  await expect(page.getByTestId("aging-INR-31-60")).toContainText("-")
  await expect(page.getByTestId("aging-INR-61+")).toContainText("₹40,000.00")
  // currencies are never added together
  await expect(page.getByTestId("outstanding-USD")).toHaveText("$1,000.00")
  await expect(page.getByTestId("overdue-USD")).toHaveText("$1,000.00")
  await expect(page.getByText(seed.clientName).first()).toBeVisible()
})

test("the invoice list groups by month, filters through the URL and searches", async ({ page }) => {
  await login(page, USER)
  await page.goto("/invoices")
  await expect(page.getByTestId("invoice-row")).toHaveCount(6)
  const monthName = new Date().toLocaleString("en-US", { month: "long" })
  await expect(page.getByText(new RegExp(`${monthName} ${new Date().getFullYear()}`, "i")).first()).toBeVisible()

  await page.goto("/invoices?status=OVERDUE")
  await expect(page.getByTestId("invoice-row")).toHaveCount(3)
  await expect(page.getByText("Overdue").first()).toBeVisible()

  await page.goto("/invoices")
  await page.locator("#filter-status").click()
  await page.getByRole("option", { name: "Paid" }).click()
  await expect(page).toHaveURL(/status=PAID/)
  await expect(page.getByTestId("invoice-row")).toHaveCount(1)
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByTestId("invoice-row")).toHaveCount(6)

  await page.getByLabel("Search invoices").fill(seed.clientName)
  await expect(page).toHaveURL(/q=/)
  await expect(page.getByTestId("invoice-row")).toHaveCount(5)
  await page.reload()
  await expect(page.getByLabel("Search invoices")).toHaveValue(seed.clientName)
  await expect(page.getByTestId("invoice-row")).toHaveCount(5)
})

test("row actions: mark paid from the list", async ({ page }) => {
  await login(page, USER)
  await page.goto(`/invoices?q=${numbers["not-due"]}`)
  await page.getByRole("button", { name: `Actions for ${numbers["not-due"]}` }).click()
  await page.getByRole("menuitem", { name: "Mark paid" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark as paid" }).click()
  await expect(page.getByText(`${numbers["not-due"]} marked as paid`)).toBeVisible()
  await expect(page.getByTestId("invoice-row").getByText("Paid")).toBeVisible()
})

test("by client folders lead to the client page with its summary", async ({ page }) => {
  await login(page, USER)
  await page.goto("/invoices")
  await page.getByRole("tab", { name: "By client" }).click()
  await page.getByRole("link", { name: new RegExp(seed.clientName) }).click()
  await expect(page.getByRole("heading", { name: seed.clientName })).toBeVisible()
  await expect(page.getByTestId("summary-INR")).toContainText("₹1,50,000.00")
  await expect(page.getByTestId("invoice-row")).toHaveCount(5)
  await page.getByText("New invoice for this client").click()
  await expect(page).toHaveURL(/clientId=/)
})

test("discarded drafts show in the trash and can be restored", async ({ page }) => {
  await login(page, USER)
  await page.goto(`/invoices?q=${numbers["draft"]}`)
  await page.getByRole("button", { name: `Actions for ${numbers["draft"]}` }).click()
  await page.getByRole("menuitem", { name: "Discard draft" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard draft" }).click()
  await expect(page.getByText("Draft discarded")).toBeVisible()
  await page.goto("/invoices?tab=trash")
  await expect(page.getByTestId("invoice-row")).toHaveCount(1)
  await page.getByRole("button", { name: `Actions for ${numbers["draft"]}` }).click()
  await page.getByRole("menuitem", { name: "Restore" }).click()
  await expect(page.getByText("The Trash is empty")).toBeVisible()
})

test("activity lists changes and the command palette jumps to an invoice", async ({ page }) => {
  await login(page, USER)
  await page.goto("/activity")
  await expect(page.getByText(new RegExp(`Issued ${numbers["overdue-20"]}`))).toBeVisible()

  await page.goto("/")
  await expect(page.getByRole("button", { name: /Search/ })).toBeVisible()
  await page.keyboard.press("Control+k")
  await page.getByPlaceholder("Invoice number or client name").fill(numbers["overdue-75"] ?? "")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId("invoice-number")).toHaveText(numbers["overdue-75"] ?? "")
})

import { expect, test } from "@playwright/test"
import { PDFDocument } from "pdf-lib"
import { formatMoney } from "../packages/shared/src/index"
import { apiAs, login } from "./helpers"

interface Row {
  id: string
  number: string
}
interface Detail {
  doc: { items: unknown[] }
}
interface Dashboard {
  currencies: {
    currency: "INR" | "USD"
    outstandingMinor: number
    overdueMinor: number
    paidThisYearMinor: number
    draftsCount: number
  }[]
}

test("the dashboard shows the seeded totals exactly as the API computes them", async ({
  page,
}) => {
  const api = await apiAs()
  const dash = (await (await api.get("/api/dashboard")).json()) as Dashboard
  expect(dash.currencies.map((c) => c.currency)).toEqual(["INR", "USD"])
  await login(page)
  for (const c of dash.currencies) {
    await expect(page.getByTestId(`outstanding-${c.currency}`)).toHaveText(
      formatMoney(c.outstandingMinor, c.currency)
    )
    await expect(page.getByTestId(`overdue-${c.currency}`)).toHaveText(
      formatMoney(c.overdueMinor, c.currency)
    )
    await expect(page.getByTestId(`paid-year-${c.currency}`)).toHaveText(
      formatMoney(c.paidThisYearMinor, c.currency)
    )
    await expect(page.getByTestId(`drafts-${c.currency}`)).toHaveText(
      String(c.draftsCount)
    )
  }
  expect(dash.currencies[0]?.overdueMinor).toBeGreaterThan(0)
})

test("the seeded three-page invoice previews and exports as three identical pages", async ({
  page,
}) => {
  test.setTimeout(120_000)
  const api = await apiAs()
  const rows = (
    (await (await api.get("/api/invoices")).json()) as { rows: Row[] }
  ).rows
  let big: Row | undefined
  for (const row of rows) {
    const detail = (await (
      await api.get(`/api/invoices/${row.id}`)
    ).json()) as Detail
    if (detail.doc.items.length >= 40) big = row
  }
  expect(big, "a seeded invoice with 40+ items").toBeDefined()

  await login(page)
  await page.goto(`/invoices/${big?.id}`)
  const pages = page.getByTestId("preview-pages").locator(".tpl-page")
  await expect(pages).toHaveCount(3, { timeout: 30_000 })
  await expect(
    page.getByTestId("preview-pages").locator(".hdr-cont")
  ).toHaveCount(2)
  await expect(page.getByTestId("preview-pages").locator(".thead")).toHaveCount(
    3
  )

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: "Export PDF" }).click(),
  ])
  const path = await download.path()
  const { readFile } = await import("node:fs/promises")
  const pdf = await PDFDocument.load(await readFile(path))
  expect(pdf.getPageCount()).toBe(3)
})

test("the seed covers every status and the trash", async () => {
  const api = await apiAs()
  const live = (
    (await (await api.get("/api/invoices")).json()) as {
      rows: { status: string; isOverdue: boolean }[]
    }
  ).rows
  const statuses = new Set(live.map((r) => r.status))
  expect(statuses).toEqual(new Set(["DRAFT", "ISSUED", "PAID", "CANCELLED"]))
  expect(live.some((r) => r.isOverdue)).toBe(true)
  const trash = (
    (await (await api.get("/api/invoices?trash=true")).json()) as {
      rows: unknown[]
    }
  ).rows
  expect(trash.length).toBeGreaterThanOrEqual(1)
})

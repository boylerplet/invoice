import {
  calculate,
  type DashboardDto,
  type InvoiceDetailDto,
  type InvoiceListDto,
} from "@workspace/shared"
import { describe, expect, it } from "vitest"
import { seedDemo } from "./seed/run"
import { Client, makeEnv } from "./test-utils"

const START = new Date("2026-10-07T06:00:00Z")

async function seeded() {
  const env = makeEnv("2026-10-07T06:00:00Z")
  const result = await seedDemo(env.db, env.deps.config, START)
  const api = new Client(env)
  await api.login("demo", "demo1234")
  return { env, api, result }
}

describe("demo seed", () => {
  it("creates the fictional studio with consistent invoices", async () => {
    const { api, result } = await seeded()
    expect(result.invoices).toBe(14)

    const live = (await api.json<InvoiceListDto>("GET", "/invoices")).body.rows
    const trash = (
      await api.json<InvoiceListDto>("GET", "/invoices?trash=true")
    ).body.rows
    expect(live).toHaveLength(13)
    expect(trash).toHaveLength(1)

    const count = (status: string) =>
      live.filter((r) => r.status === status).length
    expect(count("PAID")).toBe(3)
    expect(count("CANCELLED")).toBe(1)
    expect(count("DRAFT")).toBe(1)
    expect(count("ISSUED")).toBe(8)
    expect(
      live
        .filter((r) => r.isOverdue)
        .map((r) => r.dueDate)
        .sort()
    ).toEqual(["2026-07-24", "2026-09-17"])

    // Numbers are unique and contiguous: gaps only exist where numbers are kept by the cancelled and discarded invoices.
    const numbers = [...live, ...trash].map((r) => r.number).sort()
    expect(new Set(numbers).size).toBe(14)
    expect(numbers).toEqual(
      Array.from(
        { length: 14 },
        (_, i) => `INV-2026-${String(i + 1).padStart(4, "0")}`
      )
    )
    expect(trash[0]?.status).toBe("DRAFT")
  })

  it("covers every pricing shape, the USD Letter invoice and the revision history", async () => {
    const { api } = await seeded()
    const rows = (await api.json<InvoiceListDto>("GET", "/invoices")).body.rows
    const detail = async (id: string) =>
      (await api.json<InvoiceDetailDto>("GET", `/invoices/${id}`)).body
    const docs = await Promise.all(rows.map((r) => detail(r.id)))

    const long = docs.find((d) => d.doc.items.length >= 40)
    expect(long?.doc.items.length).toBe(42)

    const modes = new Set(
      docs.flatMap((d) => d.doc.items.map((i) => i.pricing))
    )
    expect(modes).toEqual(new Set(["explicit", "rollup", "none"]))
    const rollupChildren = docs.flatMap((d) =>
      d.doc.items
        .filter((i) => i.pricing === "rollup")
        .flatMap((i) => i.children)
    )
    expect(rollupChildren.some((c) => c.rate !== null && c.qty === null)).toBe(
      true
    )
    expect(rollupChildren.some((c) => c.rate !== null && c.qty !== null)).toBe(
      true
    )
    expect(rollupChildren.some((c) => c.rate === null)).toBe(true)

    const usd = docs.find((d) => d.doc.currency === "USD")
    expect(usd?.doc.presentation.paperSize).toBe("LETTER")
    expect(
      docs.some((d) => d.doc.tax.enabled && d.doc.notes && d.doc.payment)
    ).toBe(true)
    expect(
      docs.some(
        (d) =>
          d.doc.adjustments.some((a) => a.kind === "discount") &&
          d.doc.adjustments.some((a) => a.kind === "charge")
      )
    ).toBe(true)

    const revised = docs.find((d) => d.revision === 3)
    expect(revised).toBeDefined()
    const revisions = (
      await api.json<{ revision: number; note: string | null }[]>(
        "GET",
        `/invoices/${revised?.id}/revisions`
      )
    ).body
    expect(revisions.map((r) => r.note)).toEqual([
      "Raised the illustration estimate",
      "Added a QA pass",
      "Issued",
    ])
    expect(docs.filter((d) => d.status === "CANCELLED")[0]?.cancelReason).toBe(
      "Superseded by revised scope"
    )
  })

  it("makes the dashboard add up from the invoices themselves", async () => {
    const { api } = await seeded()
    const rows = (await api.json<InvoiceListDto>("GET", "/invoices")).body.rows
    const details = await Promise.all(
      rows.map(
        async (r) =>
          (await api.json<InvoiceDetailDto>("GET", `/invoices/${r.id}`)).body
      )
    )
    const total = (
      pick: (d: InvoiceDetailDto) => boolean,
      currency: "INR" | "USD"
    ) =>
      details
        .filter((d) => d.doc.currency === currency && pick(d))
        .reduce((sum, d) => sum + calculate(d.doc).total, 0)

    const dash = (await api.json<DashboardDto>("GET", "/dashboard")).body
    const inr = dash.currencies.find((c) => c.currency === "INR")
    const usd = dash.currencies.find((c) => c.currency === "USD")
    expect(inr?.outstandingMinor).toBe(
      total((d) => d.status === "ISSUED", "INR")
    )
    expect(inr?.overdueMinor).toBe(total((d) => d.isOverdue, "INR"))
    expect(inr?.overdueCount).toBe(2)
    expect(inr?.draftsCount).toBe(1)
    expect(inr?.paidThisYearMinor).toBe(
      total((d) => d.status === "PAID", "INR")
    )
    expect(usd?.outstandingMinor).toBe(
      total((d) => d.status === "ISSUED", "USD")
    )
    expect(inr?.aging["61+"].count).toBe(1)
    expect(inr?.aging["1-30"].count).toBe(1)
    expect(inr?.aging.notDue.count).toBe(5)
    // every stored total equals a fresh calculation
    for (const d of details) expect(d.totalMinor).toBe(calculate(d.doc).total)
  })

  it("refuses to seed twice", async () => {
    const { env } = await seeded()
    await expect(seedDemo(env.db, env.deps.config, START)).rejects.toThrow(
      /already exists/
    )
  })
})

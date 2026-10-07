import type { InvoiceDoc } from "@workspace/shared"
import { describe, expect, it } from "vitest"
import { bootstrap, Client, makeEnv, priced, type TestEnv } from "./test-utils"

interface Detail {
  id: string
  number: string
  status: string
  revision: number
  totalMinor: number
  isOverdue: boolean
  deletedAt: string | null
  doc: InvoiceDoc
}

async function newInvoice(env: TestEnv) {
  const ctx = await bootstrap(env)
  const created = await ctx.api.json<Detail>("POST", "/invoices", { clientId: ctx.customer.id })
  return { ...ctx, invoice: created.body }
}

const save = (api: Client, id: string, doc: InvoiceDoc, changeNote?: string) =>
  api.json<Detail>("PUT", `/invoices/${id}`, { doc, changeNote })

describe("invoice lifecycle", () => {
  it("creates a numbered draft from client and profile defaults", async () => {
    const env = makeEnv()
    const { invoice, profile, customer } = await newInvoice(env)
    expect(invoice.number).toBe("INV-2026-0001")
    expect(invoice.status).toBe("DRAFT")
    expect(invoice.doc.issuer.profileId).toBe(profile.id)
    expect(invoice.doc.client.clientId).toBe(customer.id)
    expect(invoice.doc.issueDate).toBe("2026-06-15")
    expect(invoice.doc.dueDate).toBe("2026-06-30")
    expect(invoice.doc.items).toHaveLength(1)
  })

  it("autosaves a draft without a revision and recomputes the total on the server", async () => {
    const env = makeEnv()
    const { api, invoice } = await newInvoice(env)
    const res = await save(api, invoice.id, priced(invoice.doc, 250_000))
    expect(res.status).toBe(200)
    expect(res.body.totalMinor).toBe(250_000)
    expect(res.body.revision).toBe(0)
    const revisions = await api.json<unknown[]>("GET", `/invoices/${invoice.id}/revisions`)
    expect(revisions.body).toHaveLength(0)
  })

  it("accepts an incomplete draft but refuses to issue it", async () => {
    const env = makeEnv()
    const { api, invoice } = await newInvoice(env)
    expect((await save(api, invoice.id, invoice.doc)).status).toBe(200)
    const issue = await api.json("POST", `/invoices/${invoice.id}/issue`)
    expect(issue.status).toBe(422)
  })

  it("issue writes revision 1; saving an ISSUED invoice adds revisions", async () => {
    const env = makeEnv()
    const { api, invoice } = await newInvoice(env)
    const doc = priced(invoice.doc)
    await save(api, invoice.id, doc)
    const issued = await api.json<Detail>("POST", `/invoices/${invoice.id}/issue`)
    expect(issued.body.status).toBe("ISSUED")
    expect(issued.body.revision).toBe(1)

    const edited = await save(api, invoice.id, priced(doc, 300_000), "Raised rate")
    expect(edited.status).toBe(200)
    expect(edited.body.revision).toBe(2)
    expect(edited.body.totalMinor).toBe(300_000)

    const list = await api.json<{ revision: number; note: string | null; totalMinor: number }[]>(
      "GET",
      `/invoices/${invoice.id}/revisions`
    )
    expect(list.body.map((r) => r.revision)).toEqual([2, 1])
    expect(list.body[0]?.note).toBe("Raised rate")
    const first = await api.json<{ doc: InvoiceDoc; totalMinor: number }>("GET", `/invoices/${invoice.id}/revisions/1`)
    expect(first.body.totalMinor).toBe(100_000)
  })

  it("validates strictly when saving an ISSUED invoice", async () => {
    const env = makeEnv()
    const { api, invoice } = await newInvoice(env)
    const doc = priced(invoice.doc)
    await save(api, invoice.id, doc)
    await api.json("POST", `/invoices/${invoice.id}/issue`)
    const bad = { ...doc, items: [{ ...doc.items[0]!, rate: null }] }
    expect((await save(api, invoice.id, bad)).status).toBe(422)
  })

  it("pays, blocks edits on PAID (409), reopens, cancels", async () => {
    const env = makeEnv()
    const { api, invoice } = await newInvoice(env)
    const doc = priced(invoice.doc)
    await save(api, invoice.id, doc)
    await api.json("POST", `/invoices/${invoice.id}/issue`)

    const paid = await api.json<Detail>("POST", `/invoices/${invoice.id}/pay`, { paidDate: "2026-06-20", note: "UPI" })
    expect(paid.body.status).toBe("PAID")
    expect((await save(api, invoice.id, doc)).status).toBe(409)
    expect((await api.json("POST", `/invoices/${invoice.id}/cancel`, {})).status).toBe(409)

    const reopened = await api.json<Detail>("POST", `/invoices/${invoice.id}/reopen`)
    expect(reopened.body.status).toBe("ISSUED")
    const cancelled = await api.json<Detail>("POST", `/invoices/${invoice.id}/cancel`, { reason: "Duplicate" })
    expect(cancelled.body.status).toBe("CANCELLED")
    expect((await save(api, invoice.id, doc)).status).toBe(409)
    expect((await api.json("POST", `/invoices/${invoice.id}/issue`)).status).toBe(409)
  })

  it("derives overdue and never stores it", async () => {
    const env = makeEnv()
    const { api, invoice } = await newInvoice(env)
    await save(api, invoice.id, priced(invoice.doc))
    await api.json("POST", `/invoices/${invoice.id}/issue`)
    expect((await api.json<Detail>("GET", `/invoices/${invoice.id}`)).body.isOverdue).toBe(false)
    env.clock.now = new Date("2026-07-10T10:00:00Z")
    const later = await api.json<Detail>("GET", `/invoices/${invoice.id}`)
    expect(later.body.isOverdue).toBe(true)
    expect(later.body.status).toBe("ISSUED")
    const overdue = await api.json<{ rows: { id: string }[] }>("GET", "/invoices?status=OVERDUE")
    expect(overdue.body.rows.map((r) => r.id)).toEqual([invoice.id])
  })

  it("duplicates into a new draft with a new number and fresh dates", async () => {
    const env = makeEnv()
    const { api, invoice } = await newInvoice(env)
    await save(api, invoice.id, priced(invoice.doc))
    await api.json("POST", `/invoices/${invoice.id}/issue`)
    await api.json("POST", `/invoices/${invoice.id}/cancel`, {})
    env.clock.now = new Date("2026-07-10T10:00:00Z")
    const copy = await api.json<Detail>("POST", `/invoices/${invoice.id}/duplicate`)
    expect(copy.status).toBe(201)
    expect(copy.body.status).toBe("DRAFT")
    expect(copy.body.number).toBe("INV-2026-0002")
    expect(copy.body.doc.issueDate).toBe("2026-07-10")
    expect(copy.body.doc.items[0]?.id).not.toBe(invoice.doc.items[0]?.id)
  })
})

describe("discard, trash and numbers", () => {
  it("discards only drafts and keeps the number reserved", async () => {
    const env = makeEnv()
    const { api, customer, invoice } = await newInvoice(env)
    const discarded = await api.json<Detail>("POST", `/invoices/${invoice.id}/discard`)
    expect(discarded.body.deletedAt).not.toBeNull()
    expect((await api.json<{ rows: unknown[] }>("GET", "/invoices")).body.rows).toHaveLength(0)
    expect((await api.json<{ rows: unknown[] }>("GET", "/invoices?trash=true")).body.rows).toHaveLength(1)

    const next = await api.json<Detail>("POST", "/invoices", { clientId: customer.id })
    expect(next.body.number).toBe("INV-2026-0002")

    const restored = await api.json<Detail>("POST", `/invoices/${invoice.id}/restore`)
    expect(restored.body.deletedAt).toBeNull()

    await save(api, next.body.id, priced(next.body.doc))
    await api.json("POST", `/invoices/${next.body.id}/issue`)
    expect((await api.json("POST", `/invoices/${next.body.id}/discard`)).status).toBe(409)
  })

  it("never reuses a number, even a manually freed one", async () => {
    const env = makeEnv()
    const { api, customer, invoice } = await newInvoice(env)
    const renumbered = { ...invoice.doc, number: "INV-2026-0009" }
    expect((await save(api, invoice.id, renumbered)).status).toBe(200)
    const next = await api.json<Detail>("POST", "/invoices", { clientId: customer.id })
    expect(next.body.number).toBe("INV-2026-0010")
    const clash = await save(api, next.body.id, { ...next.body.doc, number: "INV-2026-0009" })
    expect(clash.status).toBe(409)
    expect(
      (await api.json<{ available: boolean }>("GET", "/invoices/check-number?number=INV-2026-0009")).body.available
    ).toBe(false)
  })

  it("skips a manual number that collides with the sequence", async () => {
    const env = makeEnv()
    const { api, customer } = await newInvoice(env)
    const second = await api.json<Detail>("POST", "/invoices", { clientId: customer.id })
    await save(api, second.body.id, { ...second.body.doc, number: "INV-2026-0003" })
    const third = await api.json<Detail>("POST", "/invoices", { clientId: customer.id })
    expect(third.body.number).toBe("INV-2026-0004")
  })

  it("allocates unique numbers under concurrent creates", async () => {
    const env = makeEnv()
    const { api, customer } = await newInvoice(env)
    const results = await Promise.all(
      Array.from({ length: 12 }, () => api.json<Detail>("POST", "/invoices", { clientId: customer.id }))
    )
    const numbers = results.map((r) => r.body.number)
    expect(new Set(numbers).size).toBe(12)
    expect(results.every((r) => r.status === 201)).toBe(true)
  })

  it("restarts the counter in a new year", async () => {
    const env = makeEnv("2026-12-31T10:00:00Z")
    const { api, customer } = await newInvoice(env)
    env.clock.now = new Date("2027-01-02T10:00:00Z")
    const next = await api.json<Detail>("POST", "/invoices", { clientId: customer.id })
    expect(next.body.number).toBe("INV-2027-0001")
  })
})

describe("workspace isolation", () => {
  it("never exposes another workspace's data", async () => {
    const env = makeEnv()
    const a = await newInvoice(env)
    const b = await bootstrap(env, "other", "Other Studio")
    expect((await b.api.json("GET", `/invoices/${a.invoice.id}`)).status).toBe(404)
    expect((await b.api.json("PUT", `/invoices/${a.invoice.id}`, { doc: a.invoice.doc })).status).toBe(404)
    expect((await b.api.json("POST", `/invoices/${a.invoice.id}/issue`)).status).toBe(404)
    expect((await b.api.json("GET", `/clients/${a.customer.id}`)).status).toBe(404)
    expect((await b.api.json("POST", "/invoices", { clientId: a.customer.id })).status).toBe(404)
    expect((await b.api.json<unknown[]>("GET", "/clients")).body).toHaveLength(1)
    const list = await b.api.json<{ rows: unknown[] }>("GET", "/invoices")
    expect(list.body.rows).toHaveLength(0)
    expect((await b.api.json("GET", `/invoices/${a.invoice.id}/revisions`)).status).toBe(404)
  })

  it("numbers each workspace independently", async () => {
    const env = makeEnv()
    await newInvoice(env)
    const b = await bootstrap(env, "other", "Other Studio")
    const created = await b.api.json<Detail>("POST", "/invoices", { clientId: b.customer.id })
    expect(created.body.number).toBe("INV-2026-0001")
  })
})

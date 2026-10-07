import { readdirSync } from "node:fs"
import { unzipSync } from "fflate"
import { describe, expect, it } from "vitest"
import { clientInput, bootstrap, makeEnv, priced } from "./test-utils"

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

function logoForm(bytes: Uint8Array, name = "logo.png") {
  const form = new FormData()
  form.append("file", new File([bytes], name))
  return form
}

describe("logo upload", () => {
  it("stores a PNG, and replaces/removes it", async () => {
    const env = makeEnv()
    const { api, profile } = await bootstrap(env)
    const send = (bytes: Uint8Array) =>
      env.app.request(`http://localhost/api/issuer-profiles/${profile.id}/logo`, {
        method: "POST",
        headers: { cookie: api.cookie },
        body: logoForm(bytes),
      })
    const res = await send(PNG)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { logoFile: string }
    expect(body.logoFile).toMatch(/\.png$/)
    expect(readdirSync(env.deps.config.uploadsDir)).toEqual([body.logoFile])

    await send(PNG)
    expect(readdirSync(env.deps.config.uploadsDir)).toHaveLength(1)

    await api.request("DELETE", `/issuer-profiles/${profile.id}/logo`)
    expect(readdirSync(env.deps.config.uploadsDir)).toHaveLength(0)
  })

  it("rejects files by magic bytes, not by name", async () => {
    const env = makeEnv()
    const { api, profile } = await bootstrap(env)
    const res = await env.app.request(`http://localhost/api/issuer-profiles/${profile.id}/logo`, {
      method: "POST",
      headers: { cookie: api.cookie },
      body: logoForm(new TextEncoder().encode("MZ not an image"), "evil.png"),
    })
    expect(res.status).toBe(415)
  })

  it("rejects unsafe SVG and oversized files", async () => {
    const env = makeEnv()
    const { api, profile } = await bootstrap(env)
    const post = (bytes: Uint8Array) =>
      env.app.request(`http://localhost/api/issuer-profiles/${profile.id}/logo`, {
        method: "POST",
        headers: { cookie: api.cookie },
        body: logoForm(bytes, "x.svg"),
      })
    const bad = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect((await post(bad)).status).toBe(415)
    const good = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>')
    expect((await post(good)).status).toBe(200)
    const big = new Uint8Array(2 * 1024 * 1024 + 1)
    big.set(PNG)
    expect((await post(big)).status).toBe(413)
  })
})

describe("clients and profiles", () => {
  it("validates input with field errors", async () => {
    const env = makeEnv()
    const { api } = await bootstrap(env)
    const res = await api.json<{ error: { code: string; fields: Record<string, string> } }>("POST", "/clients", {
      ...clientInput(),
      name: "",
    })
    expect(res.status).toBe(422)
    expect(res.body.error.fields.name).toBeDefined()
  })

  it("refuses defaults that point at another workspace", async () => {
    const env = makeEnv()
    const a = await bootstrap(env)
    const b = await bootstrap(env, "other", "Other")
    const res = await b.api.json("POST", "/clients", clientInput({ defaultIssuerProfileId: a.profile.id }))
    expect(res.status).toBe(422)
  })

  it("keeps exactly one default profile and archives instead of deleting", async () => {
    const env = makeEnv()
    const { api, profile } = await bootstrap(env)
    const second = await api.json<{ id: string }>("POST", "/issuer-profiles", {
      displayName: "Second",
      legalName: null,
      addressLines: [],
      email: null,
      phone: null,
      website: null,
      taxIds: [],
      defaultPaymentAccountId: null,
      isDefault: true,
    })
    const list = await api.json<{ id: string; isDefault: boolean }[]>("GET", "/issuer-profiles")
    expect(list.body.filter((p) => p.isDefault).map((p) => p.id)).toEqual([second.body.id])
    await api.json("POST", `/issuer-profiles/${profile.id}/archive`)
    expect((await api.json<unknown[]>("GET", "/issuer-profiles")).body).toHaveLength(1)
  })

  it("updates workspace settings and numbering preview", async () => {
    const env = makeEnv()
    const { api } = await bootstrap(env)
    const ws = (await api.json<{ name: string; timezone: string; settings: Record<string, unknown> }>("GET", "/workspace")).body
    const updated = await api.json("PUT", "/workspace", {
      ...ws,
      settings: { ...ws.settings, numbering: { prefix: "ACME", separator: "/", period: "financial", fyStartMonth: 4, padding: 3, startNumber: 1, resetEachPeriod: true } },
    })
    expect(updated.status).toBe(200)
    const preview = await api.json<{ number: string }>("POST", "/invoices/next-number-preview", { date: "2026-03-31" })
    expect(preview.body.number).toBe("ACME/25-26/001")
    const bad = await api.json("PUT", "/workspace", { ...ws, timezone: "Nowhere/Land" })
    expect(bad.status).toBe(422)
  })
})

describe("dashboard, client summary and activity", () => {
  it("aggregates per currency and ages overdue invoices", async () => {
    const env = makeEnv("2026-06-30T10:00:00Z")
    const { api, customer } = await bootstrap(env)
    const make = async (rate: number, dueDate: string, pay = false) => {
      const created = await api.json<{ id: string; doc: Parameters<typeof priced>[0] }>("POST", "/invoices", { clientId: customer.id })
      const doc = { ...priced(created.body.doc, rate), dueDate }
      await api.json("PUT", `/invoices/${created.body.id}`, { doc })
      await api.json("POST", `/invoices/${created.body.id}/issue`)
      if (pay) await api.json("POST", `/invoices/${created.body.id}/pay`, { paidDate: "2026-06-10" })
    }
    await make(100_000, "2026-07-15")
    await make(200_000, "2026-06-20")
    await make(400_000, "2026-05-10")
    await make(800_000, "2026-03-01")
    await make(1_600_000, "2026-06-01", true)
    await api.json("POST", "/invoices", { clientId: customer.id })

    const dash = (await api.json<{ currencies: { currency: string; outstandingMinor: number; overdueMinor: number; overdueCount: number; paidThisMonthMinor: number; paidThisYearMinor: number; draftsCount: number; aging: Record<string, { amountMinor: number; count: number }>; topClients: { outstandingMinor: number }[] }[] }>("GET", "/dashboard")).body
    expect(dash.currencies).toHaveLength(1)
    const inr = dash.currencies[0]!
    expect(inr.outstandingMinor).toBe(1_500_000)
    expect(inr.overdueMinor).toBe(1_400_000)
    expect(inr.overdueCount).toBe(3)
    expect(inr.paidThisMonthMinor).toBe(1_600_000)
    expect(inr.paidThisYearMinor).toBe(1_600_000)
    expect(inr.draftsCount).toBe(1)
    expect(inr.aging.notDue?.amountMinor).toBe(100_000)
    expect(inr.aging["1-30"]?.amountMinor).toBe(200_000)
    expect(inr.aging["31-60"]?.amountMinor).toBe(400_000)
    expect(inr.aging["61+"]?.amountMinor).toBe(800_000)
    expect(inr.topClients[0]?.outstandingMinor).toBe(1_500_000)

    const summary = await api.json<{ invoiceCount: number; byCurrency: { INR?: { billedMinor: number; paidMinor: number; outstandingMinor: number } } }>("GET", `/clients/${customer.id}/summary`)
    expect(summary.body.invoiceCount).toBe(6)
    expect(summary.body.byCurrency.INR).toEqual({ billedMinor: 3_100_000, paidMinor: 1_600_000, outstandingMinor: 1_500_000 })
  })

  it("logs activity and pages it", async () => {
    const env = makeEnv()
    const { api, customer } = await bootstrap(env)
    for (let i = 0; i < 3; i++) {
      env.clock.now = new Date(env.clock.now.getTime() + 1000)
      await api.json("POST", "/invoices", { clientId: customer.id })
    }
    const page = await api.json<{ rows: { type: string }[]; next: string | null }>("GET", "/activity")
    expect(page.body.rows.filter((r) => r.type === "invoice.created")).toHaveLength(3)
    expect(page.body.rows.some((r) => r.type === "client.created")).toBe(true)
    expect(page.body.next).toBeNull()
  })
})

describe("backup", () => {
  it("exports JSON without password hashes and a zip with uploads", async () => {
    const env = makeEnv()
    const { api, profile } = await bootstrap(env)
    await env.app.request(`http://localhost/api/issuer-profiles/${profile.id}/logo`, {
      method: "POST",
      headers: { cookie: api.cookie },
      body: logoForm(PNG),
    })
    const json = await api.request("GET", "/export/backup?format=json")
    const text = await json.text()
    expect(text).not.toContain("passwordHash")
    expect(text).not.toContain("$argon2")

    const zip = await api.request("GET", "/export/backup")
    expect(zip.headers.get("content-type")).toBe("application/zip")
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()))
    expect(Object.keys(files)).toContain("data.json")
    expect(Object.keys(files).some((f) => f.startsWith("uploads/"))).toBe(true)
  })
})

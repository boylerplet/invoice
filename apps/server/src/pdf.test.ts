import { describe, expect, it } from "vitest"
import { findBrowser, pdfFilename, type PdfRenderer } from "./services/pdf"
import { signPrintToken, verifyPrintToken } from "./services/printToken"
import { bootstrap, makeEnv, priced } from "./test-utils"

const NOW = new Date("2026-06-15T10:00:00Z")

describe("print tokens", () => {
  const secret = "s3cret"
  const claims = { ws: "w1", id: "inv1", rev: 3 }

  it("accept a fresh token for the same invoice", () => {
    const token = signPrintToken(secret, claims, NOW)
    expect(verifyPrintToken(secret, token, "inv1", NOW)).toEqual({ ws: "w1", rev: 3 })
  })
  it("reject another invoice, a wrong secret, tampering and expiry", () => {
    const token = signPrintToken(secret, claims, NOW)
    expect(verifyPrintToken(secret, token, "other", NOW)).toBeNull()
    expect(verifyPrintToken("wrong", token, "inv1", NOW)).toBeNull()
    expect(verifyPrintToken(secret, `${token}x`, "inv1", NOW)).toBeNull()
    expect(verifyPrintToken(secret, "garbage", "inv1", NOW)).toBeNull()
    expect(verifyPrintToken(secret, token, "inv1", new Date(NOW.getTime() + 61_000))).toBeNull()
  })
})

describe("filenames and browser lookup", () => {
  it("builds a safe file name", () => {
    expect(pdfFilename("INV-2026-0004", "Kaveri Automation Pvt Ltd")).toBe("INV-2026-0004 - Kaveri Automation Pvt Ltd.pdf")
    expect(pdfFilename("INV/1", 'A:B*C?"D<E>F|G')).toBe("INV1 - ABCDEFG.pdf")
  })
  it("prefers the configured browser and reports a missing one", () => {
    expect(findBrowser({ puppeteerExecutablePath: "/x/chrome" }, (p) => p === "/x/chrome")).toBe("/x/chrome")
    expect(findBrowser({ puppeteerExecutablePath: "/x/chrome" }, () => false)).toBeNull()
    expect(findBrowser({ puppeteerExecutablePath: null }, (p) => p === "/usr/bin/chromium")).toBe("/usr/bin/chromium")
    expect(findBrowser({ puppeteerExecutablePath: null }, () => false)).toBeNull()
  })
})

function stub() {
  const urls: string[] = []
  const renderer: PdfRenderer = {
    render: async (url) => {
      urls.push(url)
      return new TextEncoder().encode("%PDF-stub")
    },
    close: async () => undefined,
  }
  return { urls, renderer }
}

async function draft(env: ReturnType<typeof makeEnv>, complete: boolean) {
  const { api, customer } = await bootstrap(env)
  const created = (await api.json<{ id: string; doc: Parameters<typeof priced>[0] }>("POST", "/invoices", { clientId: customer.id })).body
  if (complete) await api.json("PUT", `/invoices/${created.id}`, { doc: priced(created.doc) })
  return { api, id: created.id }
}

describe("GET /invoices/:id/pdf", () => {
  it("renders the print page with a token and names the file after the invoice and client", async () => {
    const { urls, renderer } = stub()
    const env = makeEnv(undefined, renderer)
    const { api, id } = await draft(env, true)
    const res = await api.request("GET", `/invoices/${id}/pdf?issue=false`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("content-disposition")).toContain("INV-2026-0001 - Kaveri Automation.pdf")
    expect(await res.text()).toBe("%PDF-stub")
    expect(urls[0]).toContain(`/print/${id}?token=`)
    const detail = await api.json<{ status: string }>("GET", `/invoices/${id}`)
    expect(detail.body.status).toBe("DRAFT")
  })

  it("issues a draft first when asked", async () => {
    const { renderer } = stub()
    const env = makeEnv(undefined, renderer)
    const { api, id } = await draft(env, true)
    expect((await api.request("GET", `/invoices/${id}/pdf?issue=true`)).status).toBe(200)
    const detail = await api.json<{ status: string; revision: number }>("GET", `/invoices/${id}`)
    expect(detail.body).toMatchObject({ status: "ISSUED", revision: 1 })
    const activity = await api.json<{ rows: { type: string }[] }>("GET", "/activity")
    expect(activity.body.rows.map((r) => r.type)).toContain("invoice.exported")
  })

  it("does not render when issuing fails validation", async () => {
    const { urls, renderer } = stub()
    const env = makeEnv(undefined, renderer)
    const { api, id } = await draft(env, false)
    expect((await api.request("GET", `/invoices/${id}/pdf?issue=true`)).status).toBe(422)
    expect(urls).toHaveLength(0)
  })

  it("requires a session and belongs to the workspace", async () => {
    const { renderer } = stub()
    const env = makeEnv(undefined, renderer)
    const { id } = await draft(env, true)
    const other = await bootstrap(env, "other", "Other")
    expect((await other.api.request("GET", `/invoices/${id}/pdf`)).status).toBe(404)
    const anonymous = await env.app.request(`http://localhost/api/invoices/${id}/pdf`)
    expect(anonymous.status).toBe(401)
  })
})

describe("GET /print/:id", () => {
  it("serves the invoice to a valid token only", async () => {
    const env = makeEnv()
    const { api, id } = await draft(env, true)
    const workspace = (await api.json<{ id: string }>("GET", "/workspace")).body
    const token = signPrintToken(env.deps.config.printSecret, { ws: workspace.id, id, rev: 0 }, env.deps.now())
    const ok = await env.app.request(`http://localhost/api/print/${id}?token=${encodeURIComponent(token)}`)
    expect(ok.status).toBe(200)
    const body = (await ok.json()) as { doc: { number: string }; status: string }
    expect(body).toMatchObject({ status: "DRAFT", doc: { number: "INV-2026-0001" } })
    expect((await env.app.request(`http://localhost/api/print/${id}`)).status).toBe(403)
    expect((await env.app.request(`http://localhost/api/print/${id}?token=bad`)).status).toBe(403)
  })

  it("cannot read an invoice of another workspace even with a valid signature", async () => {
    const env = makeEnv()
    const { id } = await draft(env, true)
    const other = await bootstrap(env, "other", "Other")
    const otherWs = (await other.api.json<{ id: string }>("GET", "/workspace")).body.id
    const token = signPrintToken(env.deps.config.printSecret, { ws: otherWs, id, rev: 0 }, env.deps.now())
    expect((await env.app.request(`http://localhost/api/print/${id}?token=${encodeURIComponent(token)}`)).status).toBe(404)
  })
})

import { expect, request, type APIRequestContext, type Page } from "@playwright/test"

const BASE = "http://localhost:5174"

export async function login(page: Page, username = "demo", password = "demo1234"): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("Username").fill(username)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/$/)
}

/** An API client signed in as the demo user (the app's own cookie rules apply). */
export async function apiAs(username = "demo", password = "demo1234"): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE } })
  const res = await ctx.post("/api/auth/login", { data: { username, password } })
  expect(res.ok()).toBe(true)
  return ctx
}

export interface Seeded {
  clientId: string
  clientName: string
  profileId: string
  accountId: string
}

/** Creates one issuer profile, one INR payment account and a uniquely named client. */
export async function seedMasterData(api: APIRequestContext, tag: string): Promise<Seeded> {
  const clientName = `Client ${tag}`
  const profile = (await (await api.post("/api/issuer-profiles", {
    data: { displayName: `Studio ${tag}`, legalName: null, addressLines: ["Bengaluru"], email: "hi@example.com", phone: null, website: null, taxIds: [], defaultPaymentAccountId: null, isDefault: true },
  })).json()) as { id: string }
  const account = (await (await api.post("/api/payment-accounts", {
    data: { issuerProfileId: null, label: `Bank ${tag}`, currency: "INR", kind: "bank", lines: [{ label: "A/C number", value: "1234567890" }] },
  })).json()) as { id: string }
  const client = (await (await api.post("/api/clients", {
    data: { name: clientName, contactPerson: null, addressLines: ["Pune"], email: null, phone: null, taxIds: [], defaultIssuerProfileId: profile.id, defaultPaymentAccountId: account.id, defaultCurrency: null, defaultDueDays: null, notes: null },
  })).json()) as { id: string }
  return { clientId: client.id, clientName, profileId: profile.id, accountId: account.id }
}

export interface Created {
  id: string
  number: string
  doc: Record<string, unknown> & { items: Record<string, unknown>[] }
}

export async function createInvoice(api: APIRequestContext, clientId: string): Promise<Created> {
  const res = await api.post("/api/invoices", { data: { clientId } })
  expect(res.status()).toBe(201)
  return (await res.json()) as Created
}

export async function saveDoc(api: APIRequestContext, id: string, doc: unknown, changeNote?: string): Promise<void> {
  const res = await api.put(`/api/invoices/${id}`, { data: { doc, changeNote } })
  expect(res.ok(), await res.text()).toBe(true)
}

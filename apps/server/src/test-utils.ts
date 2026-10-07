import { mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ClientInput, InvoiceDoc, IssuerProfileInput } from "@workspace/shared"
import { createApp } from "./app"
import type { Config } from "./config"
import { openDb, type Db } from "./db/client"
import type { Deps } from "./http/types"
import { createUser } from "./services/users"

export interface TestEnv {
  deps: Deps
  db: Db
  app: ReturnType<typeof createApp>
  clock: { now: Date }
}

export function makeEnv(start = "2026-06-15T10:00:00Z"): TestEnv {
  const dataDir = mkdtempSync(join(tmpdir(), "invoice-test-"))
  const uploadsDir = join(dataDir, "uploads")
  mkdirSync(uploadsDir)
  const config: Config = {
    port: 0,
    host: "127.0.0.1",
    dataDir,
    dbFile: ":memory:",
    uploadsDir,
    sessionSecret: "s",
    printSecret: "p",
    cookieSecure: false,
    puppeteerExecutablePath: null,
    defaultTimezone: "Asia/Kolkata",
    webDist: join(dataDir, "no-web"),
  }
  const clock = { now: new Date(start) }
  const db = openDb(":memory:")
  const deps: Deps = { config, db, now: () => clock.now }
  return { deps, db, app: createApp(deps), clock }
}

export async function addUser(env: TestEnv, username: string, workspaceName: string, password = "password123") {
  return createUser(env.db, { username, password, workspaceName, timezone: "Asia/Kolkata" }, env.clock.now)
}

export class Client {
  cookie = ""
  constructor(private env: TestEnv) {}

  async request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const init: RequestInit = { method, headers: { ...headers, cookie: this.cookie } }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
      ;(init.headers as Record<string, string>)["content-type"] = "application/json"
    }
    return this.env.app.request(`http://localhost/api${path}`, init)
  }

  async json<T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
    const res = await this.request(method, path, body)
    return { status: res.status, body: (await res.json()) as T }
  }

  async login(username: string, password = "password123") {
    const res = await this.request("POST", "/auth/login", { username, password })
    const set = res.headers.get("set-cookie")
    if (res.status === 200 && set) this.cookie = set.split(";")[0] ?? ""
    return res
  }
}

export const profileInput = (over: Partial<IssuerProfileInput> = {}): IssuerProfileInput => ({
  displayName: "Menon Design",
  legalName: null,
  addressLines: ["Bengaluru"],
  email: "hello@example.com",
  phone: null,
  website: null,
  taxIds: [],
  defaultPaymentAccountId: null,
  isDefault: true,
  ...over,
})

export const clientInput = (over: Partial<ClientInput> = {}): ClientInput => ({
  name: "Kaveri Automation",
  contactPerson: null,
  addressLines: ["Bengaluru"],
  email: null,
  phone: null,
  taxIds: [],
  defaultIssuerProfileId: null,
  defaultPaymentAccountId: null,
  defaultCurrency: null,
  defaultDueDays: null,
  notes: null,
  ...over,
})

/** Signs in a fresh user and creates a profile and a client. */
export async function bootstrap(env: TestEnv, username = "demo", workspaceName = "Demo Studio") {
  await addUser(env, username, workspaceName)
  const client = new Client(env)
  await client.login(username)
  const profile = (await client.json<{ id: string }>("POST", "/issuer-profiles", profileInput())).body
  const customer = (await client.json<{ id: string }>("POST", "/clients", clientInput())).body
  return { api: client, profile, customer }
}

/** A draft ready to be issued: one priced item. */
export function priced(doc: InvoiceDoc, rate = 100_000): InvoiceDoc {
  const [first] = doc.items
  if (!first) throw new Error("no items")
  return { ...doc, items: [{ ...first, description: "Design work", rate }] }
}

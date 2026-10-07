import { writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  addDays,
  DEFAULT_WORKSPACE_SETTINGS,
  todayIn,
  type InvoiceDoc,
  type Item,
} from "@workspace/shared"
import type { Config } from "../config"
import type { Db } from "../db/client"
import type { AuthContext, Deps } from "../http/types"
import { activityRepo } from "../repos/activity"
import { clientsRepo } from "../repos/clients"
import { paymentAccountsRepo, profilesRepo } from "../repos/profiles"
import { workspacesRepo } from "../repos/workspaces"
import { createInvoiceService } from "../services/invoices"
import { createUser } from "../services/users"
import {
  adjustment,
  breakdown,
  child,
  fixed,
  includes,
  longEngagement,
  money,
  scope,
} from "./content"
import {
  ACCOUNTS,
  CLIENTS,
  LOGOS,
  PROFILES,
  WORKSPACE_NAME,
  type ClientSeed,
} from "./masterData"

export const DEMO_USERNAME = "demo"
export const DEMO_PASSWORD = "demo1234"

export interface SeedResult {
  workspaceId: string
  invoices: number
}

type ClientKey = ClientSeed["key"]

/** Seeds the fictional Menon Design Studio. Dates are relative to `start` so overdue and aging are always meaningful. */
export async function seedDemo(
  db: Db,
  config: Config,
  start: Date
): Promise<SeedResult> {
  const clock = { now: start }
  const deps: Deps = { config, db, now: () => clock.now }
  const days = (ago: number) => new Date(start.getTime() - ago * 86_400_000)

  const { user, workspace } = await createUser(
    db,
    {
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
      workspaceName: WORKSPACE_NAME,
      timezone: "Asia/Kolkata",
    },
    start
  )
  const ws = workspace.id
  const auth: AuthContext = {
    userId: user.id,
    workspaceId: ws,
    username: user.username,
  }
  workspacesRepo(db).update(ws, {
    name: WORKSPACE_NAME,
    timezone: "Asia/Kolkata",
    settings: { ...DEFAULT_WORKSPACE_SETTINGS, defaultDueDays: 15 },
  })

  // Profiles, logos and payment accounts
  const profiles = profilesRepo(db)
  const accounts = paymentAccountsRepo(db)
  const profileIds = {
    personal: profiles.create(ws, PROFILES.personal).id,
    company: profiles.create(ws, PROFILES.company).id,
  }
  profiles.setDefault(ws, profileIds.company)
  for (const key of ["personal", "company"] as const) {
    const file = `${key}-logo.svg`
    writeFileSync(join(config.uploadsDir, file), LOGOS[key])
    profiles.setLogo(ws, profileIds[key], file)
  }
  const accountIds = {
    personal: accounts.create(ws, {
      ...ACCOUNTS.personal,
      issuerProfileId: profileIds.personal,
    }).id,
    company: accounts.create(ws, {
      ...ACCOUNTS.company,
      issuerProfileId: profileIds.company,
    }).id,
    usd: accounts.create(ws, {
      ...ACCOUNTS.usd,
      issuerProfileId: profileIds.company,
    }).id,
  }
  for (const key of ["personal", "company"] as const) {
    profiles.update(ws, profileIds[key], {
      ...PROFILES[key],
      defaultPaymentAccountId: accountIds[key],
    })
  }

  // Clients
  const clientIds = {} as Record<ClientKey, string>
  for (const seed of CLIENTS) {
    const row = clientsRepo(db).create(ws, {
      ...seed.input,
      defaultIssuerProfileId: profileIds[seed.profile],
      defaultPaymentAccountId: accountIds[seed.account],
    })
    clientIds[seed.key] = row.id
    activityRepo(db).log(
      ws,
      {
        userId: user.id,
        clientId: row.id,
        type: "client.created",
        summary: `Added client ${seed.input.name}`,
      },
      days(120)
    )
  }

  const service = createInvoiceService(deps)
  let count = 0

  /** Creates a draft for `client` as it was `ago` days ago, fills it in and returns its id. */
  function draft(
    client: ClientKey,
    ago: number,
    build: (doc: InvoiceDoc) => InvoiceDoc,
    dueFromToday?: number
  ): string {
    clock.now = days(ago)
    const created = service.create(auth, { clientId: clientIds[client] })
    const today = todayIn("Asia/Kolkata", start)
    const doc = build(created.doc)
    const withDue =
      dueFromToday === undefined
        ? doc
        : { ...doc, dueDate: addDays(today, dueFromToday) }
    service.save(auth, created.id, { doc: withDue })
    count += 1
    return created.id
  }
  const issue = (id: string, ago: number) => {
    clock.now = days(ago)
    service.issue(auth, id)
  }
  const pay = (id: string, ago: number, note: string | null) => {
    clock.now = days(ago)
    service.pay(auth, id, {
      paidDate: todayIn("Asia/Kolkata", days(ago)),
      note,
    })
  }
  const withItems =
    (items: Item[], extra: Partial<InvoiceDoc> = {}) =>
    (doc: InvoiceDoc): InvoiceDoc => ({ ...doc, items, ...extra })

  // A. One page, two items, paid
  const a = draft(
    "kaveri",
    100,
    withItems(
      [
        fixed("Brand identity refresh: logo, colour and type", 85_000, {
          detail: "Three directions, two revision rounds",
        }),
        fixed("Brand guidelines (PDF, 24 pages)", 30_000),
      ],
      { reference: "PO-4471" }
    ),
    -85
  )
  issue(a, 100)
  pay(a, 85, "NEFT")

  // B. Notes, payment details and 18% tax, paid
  const b = draft(
    "tarang",
    65,
    withItems(
      [
        fixed("Operator HMI design: line 2 packaging", 120_000, {
          qty: "1",
          unit: "project",
        }),
        fixed("Design system and component library", 60_000),
      ],
      {
        tax: { enabled: true, label: "GST", rate: "18" },
        notes:
          "Thank you for the quick turnaround.\nPlease quote the invoice number on your transfer.",
        reference: "PO-TIC-208",
      }
    ),
    -50
  )
  issue(b, 65)
  pay(b, 50, "Bank transfer")

  // C. Discount and extra charge, paid
  const c = draft(
    "orbit",
    30,
    withItems(
      [
        fixed("Product catalogue layout", 2_400, { qty: "30", unit: "pages" }),
        fixed("Cover and back-cover design", 18_000),
      ],
      {
        adjustments: [
          adjustment("discount", "Loyalty discount", "percent", "5"),
          adjustment("charge", "Rush delivery", "fixed", String(money(6_000))),
        ],
      }
    ),
    -14
  )
  issue(c, 30)
  // Paid recently, and always within the current month so the dashboard shows a non-zero month.
  const dayOfMonth = Number(todayIn("Asia/Kolkata", start).slice(8, 10))
  pay(c, Math.min(3, dayOfMonth - 1), "UPI")

  // D. Cancelled
  const d = draft(
    "nilgiri",
    55,
    withItems([fixed("Website redesign, phase 1", 95_000)]),
    -40
  )
  issue(d, 55)
  clock.now = days(48)
  service.cancel(auth, d, { reason: "Superseded by revised scope" })

  // E. Overdue by 75 days: scope with descriptive lines
  const e = draft(
    "vantage",
    90,
    withItems([
      includes("Sensor dashboard: UX and UI design", 140_000, [
        "Device list and health states",
        "Alert rules editor",
        "Export and reporting views",
      ]),
      scope("Discovery workshop", [
        "Stakeholder interviews",
        "Competitive review",
      ]),
    ]),
    -75
  )
  issue(e, 90)

  // F. Overdue by 20 days: breakdown with priced, unpriced, flat and quantity lines
  const f = draft(
    "kaveri",
    35,
    withItems(
      [
        breakdown(
          "Condition-monitoring app, phase 1",
          [
            child("Information architecture", { rupees: 40_000 }),
            child("Included at no charge: kickoff workshop"),
            child("Screen design", { rupees: 2_800, qty: "18.5", unit: "hrs" }),
            child("Prototype and usability test", { rupees: 25_000 }),
            child("Included at no charge: design QA"),
          ],
          "Mobile and tablet"
        ),
        fixed("Hosting and staging setup", 8_000),
      ],
      { reference: "PO-KA-9921" }
    ),
    -20
  )
  issue(f, 35)

  // G. Three pages, not yet due
  const g = draft(
    "tarang",
    5,
    withItems(longEngagement(), {
      tax: { enabled: true, label: "GST", rate: "18" },
      notes: "Milestone-based; the full scope is itemised below.",
      reference: "PO-TIC-311",
    }),
    10
  )
  issue(g, 5)

  // H. Nested modes with notes, not yet due
  const h = draft(
    "orbit",
    3,
    withItems(
      [
        includes("Machine-shop dashboard", 72_000, [
          "Order board",
          "Machine status wall",
          "Daily report",
        ]),
        scope("Training", ["Half-day workshop", "Recorded session"]),
        fixed("On-site workshop", 40_000, { qty: "1", unit: "day" }),
      ],
      {
        notes: "Travel is billed at actuals and shown separately.",
      }
    ),
    12
  )
  issue(h, 3)

  // I. USD on Letter paper
  const i = draft(
    "holloway",
    2,
    (doc) => ({
      ...doc,
      items: [
        fixed("Robot fleet dashboard: UX and UI", 95, {
          qty: "40",
          unit: "hrs",
        }),
        fixed("Design system", 4_200),
      ],
      presentation: { ...doc.presentation, paperSize: "LETTER" },
      notes: "Wire fees are borne by the sender.",
    }),
    28
  )
  issue(i, 2)

  // J. Issued, then edited three times
  const j = draft(
    "nilgiri",
    20,
    withItems([
      fixed("Product film storyboards", 55_000),
      fixed("Packaging illustration set", 38_000),
    ]),
    10
  )
  issue(j, 20)
  const revise = (
    ago: number,
    note: string,
    change: (doc: InvoiceDoc) => InvoiceDoc
  ) => {
    clock.now = days(ago)
    const current = service.get(ws, j).doc
    service.save(auth, j, { doc: change(current), changeNote: note })
  }
  revise(16, "Added a QA pass", (doc) => ({
    ...doc,
    items: [...doc.items, fixed("QA and revisions", 12_000)],
  }))
  revise(12, "Raised the illustration estimate", (doc) => ({
    ...doc,
    items: doc.items.map((item) =>
      item.description.startsWith("Packaging")
        ? { ...item, rate: money(46_000) }
        : item
    ),
  }))

  // K. In-progress draft
  draft(
    "vantage",
    0,
    withItems([
      fixed("Quarterly design retainer", 90_000, {
        detail: "July to September",
      }),
    ]),
    15
  )

  // L. Due today (not overdue yet)
  const l = draft(
    "vantage",
    15,
    withItems([
      fixed("Dashboard accessibility audit", 35_000),
      fixed("Fixes and re-test", 18_000),
    ]),
    0
  )
  issue(l, 15)

  // M. Discarded draft (its number stays reserved)
  const m = draft(
    "orbit",
    8,
    withItems([fixed("Trade-fair banner (not proceeded)", 14_000)]),
    15
  )
  clock.now = days(7)
  service.discard(auth, m)

  // N. Recurring monthly retainer: flat charges, no quantity
  const n = draft(
    "kaveri",
    4,
    withItems([
      fixed("Design retainer: September", 75_000),
      fixed("Workshop facilitation", 25_000),
    ]),
    11
  )
  issue(n, 4)

  return { workspaceId: ws, invoices: count }
}

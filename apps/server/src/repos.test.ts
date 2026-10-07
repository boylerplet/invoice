import { describe, expect, it } from "vitest"
import { clientsRepo } from "./repos/clients"
import { invoicesRepo } from "./repos/invoices"
import { profilesRepo } from "./repos/profiles"
import { bootstrap, clientInput, makeEnv } from "./test-utils"

describe("repositories are workspace scoped", () => {
  it("never return or modify rows of another workspace", async () => {
    const env = makeEnv()
    const a = await bootstrap(env)
    const b = await bootstrap(env, "other", "Other")
    const created = await a.api.json<{ id: string }>("POST", "/invoices", {
      clientId: a.customer.id,
    })
    const bWs = (await b.api.json<{ id: string }>("GET", "/workspace")).body.id

    expect(invoicesRepo(env.db).get(bWs, created.body.id)).toBeUndefined()
    expect(
      invoicesRepo(env.db).list(bWs, { today: "2026-06-15" })
    ).toHaveLength(0)
    expect(invoicesRepo(env.db).numberTaken(bWs, "INV-2026-0001")).toBe(false)
    expect(clientsRepo(env.db).get(bWs, a.customer.id)).toBeUndefined()
    expect(profilesRepo(env.db).get(bWs, a.profile.id)).toBeUndefined()

    clientsRepo(env.db).update(
      bWs,
      a.customer.id,
      clientInput({ name: "Hijacked" })
    )
    expect(
      clientsRepo(env.db).list(
        (await a.api.json<{ id: string }>("GET", "/workspace")).body.id
      )[0]?.name
    ).toBe("Kaveri Automation")
  })
})

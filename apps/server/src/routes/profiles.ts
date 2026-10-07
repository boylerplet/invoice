import {
  issuerProfileInputSchema,
  paymentAccountInputSchema,
  type IssuerProfileInput,
  type PaymentAccountInput,
} from "@workspace/shared"
import { Hono } from "hono"
import { jsonBody } from "../http/body"
import { ApiError, notFound } from "../http/errors"
import type { AppEnv, Deps } from "../http/types"
import { paymentAccountsRepo, profilesRepo } from "../repos/profiles"
import { deleteUpload, saveLogo } from "../services/uploads"

export function profileRoutes(deps: Deps) {
  const app = new Hono<AppEnv>()
  const profiles = () => profilesRepo(deps.db)
  const accounts = () => paymentAccountsRepo(deps.db)

  function checkRefs(ws: string, input: IssuerProfileInput): void {
    if (input.defaultPaymentAccountId && !accounts().get(ws, input.defaultPaymentAccountId)) {
      throw new ApiError(422, "VALIDATION", "Unknown payment account", {
        defaultPaymentAccountId: "Unknown payment account",
      })
    }
  }

  app.get("/", (c) => c.json(profiles().list(c.get("auth").workspaceId, c.req.query("archived") === "true")))

  app.get("/:id", (c) => {
    const row = profiles().get(c.get("auth").workspaceId, c.req.param("id"))
    if (!row) throw notFound("Issuer profile")
    return c.json(row)
  })

  app.post("/", async (c) => {
    const ws = c.get("auth").workspaceId
    const input = await jsonBody(c, issuerProfileInputSchema)
    checkRefs(ws, input)
    const isFirst = profiles().list(ws, true).length === 0
    const row = profiles().create(ws, { ...input, isDefault: isFirst || input.isDefault })
    if (row.isDefault) profiles().setDefault(ws, row.id)
    return c.json(profiles().get(ws, row.id), 201)
  })

  app.put("/:id", async (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    if (!profiles().get(ws, id)) throw notFound("Issuer profile")
    const input = await jsonBody(c, issuerProfileInputSchema)
    checkRefs(ws, input)
    profiles().update(ws, id, input)
    if (input.isDefault) profiles().setDefault(ws, id)
    return c.json(profiles().get(ws, id))
  })

  app.post("/:id/archive", (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    if (!profiles().get(ws, id)) throw notFound("Issuer profile")
    profiles().setArchived(ws, id, deps.now().toISOString())
    return c.json({ ok: true })
  })

  app.post("/:id/unarchive", (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    if (!profiles().get(ws, id)) throw notFound("Issuer profile")
    profiles().setArchived(ws, id, null)
    return c.json({ ok: true })
  })

  app.post("/:id/logo", async (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    const profile = profiles().get(ws, id)
    if (!profile) throw notFound("Issuer profile")
    const form = await c.req.parseBody()
    const file = form["file"]
    if (!(file instanceof File)) throw new ApiError(400, "NO_FILE", "Attach the logo as form field 'file'")
    const stored = saveLogo(deps.config.uploadsDir, new Uint8Array(await file.arrayBuffer()))
    profiles().setLogo(ws, id, stored)
    deleteUpload(deps.config.uploadsDir, profile.logoFile)
    return c.json(profiles().get(ws, id))
  })

  app.delete("/:id/logo", (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    const profile = profiles().get(ws, id)
    if (!profile) throw notFound("Issuer profile")
    profiles().setLogo(ws, id, null)
    deleteUpload(deps.config.uploadsDir, profile.logoFile)
    return c.json(profiles().get(ws, id))
  })

  return app
}

export function paymentAccountRoutes(deps: Deps) {
  const app = new Hono<AppEnv>()
  const accounts = () => paymentAccountsRepo(deps.db)

  function checkRefs(ws: string, input: PaymentAccountInput): void {
    if (input.issuerProfileId && !profilesRepo(deps.db).get(ws, input.issuerProfileId)) {
      throw new ApiError(422, "VALIDATION", "Unknown issuer profile", { issuerProfileId: "Unknown issuer profile" })
    }
  }

  app.get("/", (c) => c.json(accounts().list(c.get("auth").workspaceId, c.req.query("archived") === "true")))

  app.post("/", async (c) => {
    const ws = c.get("auth").workspaceId
    const input = await jsonBody(c, paymentAccountInputSchema)
    checkRefs(ws, input)
    return c.json(accounts().create(ws, input), 201)
  })

  app.put("/:id", async (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    if (!accounts().get(ws, id)) throw notFound("Payment account")
    const input = await jsonBody(c, paymentAccountInputSchema)
    checkRefs(ws, input)
    accounts().update(ws, id, input)
    return c.json(accounts().get(ws, id))
  })

  app.post("/:id/archive", (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    if (!accounts().get(ws, id)) throw notFound("Payment account")
    accounts().setArchived(ws, id, deps.now().toISOString())
    return c.json({ ok: true })
  })

  app.post("/:id/unarchive", (c) => {
    const ws = c.get("auth").workspaceId
    const id = c.req.param("id")
    if (!accounts().get(ws, id)) throw notFound("Payment account")
    accounts().setArchived(ws, id, null)
    return c.json({ ok: true })
  })

  return app
}

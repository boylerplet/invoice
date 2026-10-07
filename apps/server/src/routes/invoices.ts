import {
  cancelInputSchema,
  createInvoiceInputSchema,
  isOverdue,
  isValidIsoDate,
  numberingSettingsSchema,
  payInputSchema,
  saveInvoiceInputSchema,
  todayIn,
} from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"
import { jsonBody } from "../http/body"
import { ApiError, parse } from "../http/errors"
import type { AppEnv, Deps } from "../http/types"
import { invoicesRepo } from "../repos/invoices"
import { workspacesRepo } from "../repos/workspaces"
import { activityRepo } from "../repos/activity"
import type { InvoiceService } from "../services/invoices"
import { pdfFilename, type PdfRenderer } from "../services/pdf"
import { signPrintToken } from "../services/printToken"

const isoDate = z.string().refine(isValidIsoDate, "Use YYYY-MM-DD")

const listQuerySchema = z.object({
  status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED", "OVERDUE"]).optional(),
  clientId: z.string().optional(),
  profileId: z.string().optional(),
  currency: z.enum(["INR", "USD"]).optional(),
  q: z.string().trim().max(100).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  trash: z.enum(["true", "false"]).optional(),
  sort: z
    .enum(["issueDate_desc", "issueDate_asc", "total_desc", "total_asc", "number_desc", "number_asc", "due_asc"])
    .optional(),
})

const previewSchema = z.object({
  numbering: numberingSettingsSchema.optional(),
  date: isoDate.optional(),
})

export function invoiceRoutes(deps: Deps, service: InvoiceService, pdf: PdfRenderer) {
  const app = new Hono<AppEnv>()

  app.get("/", (c) => {
    const ws = c.get("auth").workspaceId
    const q = parse(listQuerySchema, c.req.query())
    const workspace = workspacesRepo(deps.db).get(ws)
    const today = todayIn(workspace?.timezone ?? deps.config.defaultTimezone, deps.now())
    const rows = invoicesRepo(deps.db).list(ws, { ...q, trash: q.trash === "true", today })
    return c.json({ today, rows: rows.map((row) => ({ ...row, isOverdue: isOverdue(row, today) })) })
  })

  app.get("/check-number", (c) => {
    const number = c.req.query("number") ?? ""
    return c.json({ available: service.numberAvailable(c.get("auth").workspaceId, number, c.req.query("exceptId")) })
  })

  app.post("/next-number-preview", async (c) => {
    const input = await jsonBody(c, previewSchema)
    return c.json(service.nextNumberPreview(c.get("auth").workspaceId, input.numbering, input.date))
  })

  app.post("/", async (c) => {
    const input = await jsonBody(c, createInvoiceInputSchema)
    return c.json(service.create(c.get("auth"), input), 201)
  })

  app.get("/:id", (c) => c.json(service.get(c.get("auth").workspaceId, c.req.param("id"))))

  app.put("/:id", async (c) => {
    const input = await jsonBody(c, saveInvoiceInputSchema)
    return c.json(service.save(c.get("auth"), c.req.param("id"), input))
  })

  app.post("/:id/issue", (c) => c.json(service.issue(c.get("auth"), c.req.param("id"))))

  app.post("/:id/pay", async (c) => {
    const input = await jsonBody(c, payInputSchema)
    return c.json(service.pay(c.get("auth"), c.req.param("id"), input))
  })

  app.post("/:id/reopen", (c) => c.json(service.reopen(c.get("auth"), c.req.param("id"))))

  app.post("/:id/cancel", async (c) => {
    const input = await jsonBody(c, cancelInputSchema)
    return c.json(service.cancel(c.get("auth"), c.req.param("id"), input))
  })

  app.post("/:id/duplicate", (c) => c.json(service.duplicate(c.get("auth"), c.req.param("id")), 201))
  app.post("/:id/discard", (c) => c.json(service.discard(c.get("auth"), c.req.param("id"))))
  app.post("/:id/restore", (c) => c.json(service.restore(c.get("auth"), c.req.param("id"))))

  app.get("/:id/pdf", async (c) => {
    const auth = c.get("auth")
    const id = c.req.param("id")
    let detail = service.get(auth.workspaceId, id)
    // "Export & mark as issued": issue first, so the PDF shows the issued state.
    if (c.req.query("issue") === "true" && detail.status === "DRAFT") detail = service.issue(auth, id)
    const token = signPrintToken(deps.config.printSecret, { ws: auth.workspaceId, id, rev: detail.revision }, deps.now())
    const bytes = await pdf.render(`${deps.config.printBaseUrl}/print/${id}?token=${encodeURIComponent(token)}`)
    activityRepo(deps.db).log(auth.workspaceId, { userId: auth.userId, invoiceId: id, clientId: detail.doc.client.clientId, type: "invoice.exported", summary: `Exported ${detail.number} as PDF` }, deps.now())
    const filename = pdfFilename(detail.number, detail.doc.client.name)
    const ascii = filename.replace(/[^ -~]/g, "_")
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    })
  })

  app.get("/:id/revisions", (c) => c.json(service.revisions(c.get("auth").workspaceId, c.req.param("id"))))

  app.get("/:id/revisions/:rev", (c) => {
    const rev = Number(c.req.param("rev"))
    if (!Number.isInteger(rev) || rev < 1) throw new ApiError(400, "BAD_REQUEST", "Invalid revision")
    return c.json(service.revision(c.get("auth").workspaceId, c.req.param("id"), rev))
  })

  return app
}

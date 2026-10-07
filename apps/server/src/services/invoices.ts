import {
  addDays,
  allocateNumber,
  calculate,
  editMode,
  invoiceDocSchema,
  isOverdue,
  LifecycleError,
  parseCounter,
  periodKey,
  previewNextNumber,
  todayIn,
  transition,
  validateCalculation,
  type CancelInput,
  type CreateInvoiceInput,
  type InvoiceDoc,
  type NumberingSettings,
  type PayInput,
  type SaveInvoiceInput,
  type TransitionAction,
  type WorkspaceSettings,
} from "@workspace/shared"
import { ApiError, notFound, parse } from "../http/errors"
import type { AuthContext, Deps } from "../http/types"
import { activityRepo } from "../repos/activity"
import { clientsRepo } from "../repos/clients"
import { invoicesRepo, type InvoiceRow } from "../repos/invoices"
import { paymentAccountsRepo, profilesRepo } from "../repos/profiles"
import { newId, type DbLike } from "../repos/types"
import { workspacesRepo } from "../repos/workspaces"

export interface InvoiceDetail {
  id: string
  number: string
  status: InvoiceRow["status"]
  deletedAt: string | null
  revision: number
  totalMinor: number
  paidAt: string | null
  paidNote: string | null
  cancelledAt: string | null
  cancelReason: string | null
  isOverdue: boolean
  doc: InvoiceDoc
  createdAt: string
  updatedAt: string
}

type DocColumns = Pick<
  InvoiceRow,
  | "number"
  | "issueDate"
  | "dueDate"
  | "currency"
  | "clientId"
  | "clientName"
  | "issuerProfileId"
  | "issuerName"
  | "reference"
  | "totalMinor"
  | "templateId"
  | "templateVersion"
  | "paperSize"
  | "data"
>

const blankItem = (): InvoiceDoc["items"][number] => ({
  id: newId(),
  description: "",
  detail: null,
  pricing: "explicit",
  qty: null,
  unit: null,
  rate: null,
  children: [],
})

export function createInvoiceService(deps: Deps) {
  const { db } = deps

  function workspaceOf(ws: string) {
    const workspace = workspacesRepo(db).get(ws)
    if (!workspace) throw notFound("Workspace")
    return workspace
  }

  const todayFor = (ws: string) => todayIn(workspaceOf(ws).timezone, deps.now())

  function load(ws: string, id: string): InvoiceRow {
    const row = invoicesRepo(db).get(ws, id)
    if (!row) throw notFound("Invoice")
    return row
  }

  function toDetail(row: InvoiceRow, today: string): InvoiceDetail {
    return {
      id: row.id,
      number: row.number,
      status: row.status,
      deletedAt: row.deletedAt,
      revision: row.revision,
      totalMinor: row.totalMinor,
      paidAt: row.paidAt,
      paidNote: row.paidNote,
      cancelledAt: row.cancelledAt,
      cancelReason: row.cancelReason,
      isOverdue: isOverdue(row, today),
      doc: row.data,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  function allocate(
    tx: DbLike,
    ws: string,
    settings: WorkspaceSettings,
    issueDate: string
  ) {
    const repo = invoicesRepo(tx)
    const key = periodKey(settings.numbering, issueDate)
    const allocation = allocateNumber(
      settings.numbering,
      issueDate,
      repo.lastSequence(ws, key),
      (n) => repo.numberTaken(ws, n)
    )
    repo.raiseSequence(ws, key, allocation.counter)
    return allocation
  }

  /** Strict rules that must hold to issue or save an ISSUED invoice. */
  function assertIssuable(doc: InvoiceDoc): InvoiceDoc {
    const strict = parse(invoiceDocSchema, doc)
    const problems = validateCalculation(calculate(strict))
    if (problems.length > 0)
      throw new ApiError(422, "VALIDATION", problems[0] ?? "Invalid invoice")
    return strict
  }

  function rowFromDoc(doc: InvoiceDoc): DocColumns {
    return {
      number: doc.number,
      issueDate: doc.issueDate,
      dueDate: doc.dueDate,
      currency: doc.currency,
      clientId: doc.client.clientId,
      clientName: doc.client.name,
      issuerProfileId: doc.issuer.profileId,
      issuerName: doc.issuer.displayName,
      reference: doc.reference,
      totalMinor: calculate(doc).total,
      templateId: doc.presentation.templateId,
      templateVersion: doc.presentation.templateVersion,
      paperSize: doc.presentation.paperSize,
      data: doc,
    }
  }

  function applyTransition(
    status: InvoiceRow["status"],
    action: TransitionAction
  ) {
    try {
      return transition(status, action)
    } catch (error) {
      if (error instanceof LifecycleError)
        throw new ApiError(409, "INVALID_TRANSITION", error.message)
      throw error
    }
  }

  function log(
    tx: DbLike,
    auth: AuthContext,
    row: InvoiceRow,
    type: string,
    summary: string
  ) {
    activityRepo(tx).log(
      auth.workspaceId,
      {
        userId: auth.userId,
        invoiceId: row.id,
        clientId: row.clientId,
        type,
        summary,
      },
      deps.now()
    )
  }

  function newDraft(
    tx: DbLike,
    auth: AuthContext,
    doc: InvoiceDoc,
    settings: WorkspaceSettings
  ): InvoiceRow {
    const allocation = allocate(tx, auth.workspaceId, settings, doc.issueDate)
    const numbered = { ...doc, number: allocation.number }
    const stamp = deps.now().toISOString()
    const row: InvoiceRow = {
      id: newId(),
      workspaceId: auth.workspaceId,
      status: "DRAFT",
      deletedAt: null,
      paidAt: null,
      paidNote: null,
      cancelledAt: null,
      cancelReason: null,
      revision: 0,
      createdAt: stamp,
      updatedAt: stamp,
      ...rowFromDoc(numbered),
    }
    invoicesRepo(tx).insert(row)
    return row
  }

  return {
    get(ws: string, id: string): InvoiceDetail {
      return toDetail(load(ws, id), todayFor(ws))
    },

    create(auth: AuthContext, input: CreateInvoiceInput): InvoiceDetail {
      const ws = auth.workspaceId
      const workspace = workspaceOf(ws)
      const settings = workspace.settings
      const client = clientsRepo(db).get(ws, input.clientId)
      if (!client) throw notFound("Client")
      const profiles = profilesRepo(db).list(ws)
      const profile =
        profiles.find(
          (p) =>
            p.id === (input.issuerProfileId ?? client.defaultIssuerProfileId)
        ) ??
        profiles.find((p) => p.isDefault) ??
        profiles[0]
      if (!profile)
        throw new ApiError(422, "NO_PROFILE", "Create an issuer profile first")

      const currency = client.defaultCurrency ?? settings.defaultCurrency
      const accounts = paymentAccountsRepo(db)
      const accountId =
        client.defaultPaymentAccountId ?? profile.defaultPaymentAccountId
      const account = accountId ? accounts.get(ws, accountId) : undefined
      const issueDate = todayIn(workspace.timezone, deps.now())
      const dueDays = client.defaultDueDays ?? settings.defaultDueDays

      const doc: InvoiceDoc = {
        schemaVersion: 1,
        type: "INVOICE",
        number: "",
        issueDate,
        dueDate: addDays(issueDate, dueDays),
        currency,
        reference: null,
        paymentTerms: settings.defaultPaymentTerms,
        issuer: {
          profileId: profile.id,
          displayName: profile.displayName,
          legalName: profile.legalName,
          addressLines: profile.addressLines,
          email: profile.email,
          phone: profile.phone,
          website: profile.website,
          taxIds: profile.taxIds,
          logoFile: profile.logoFile,
        },
        client: {
          clientId: client.id,
          name: client.name,
          contactPerson: client.contactPerson,
          addressLines: client.addressLines,
          email: client.email,
          phone: client.phone,
          taxIds: client.taxIds,
        },
        payment:
          account && account.currency === currency
            ? {
                accountId: account.id,
                title: "Payment details",
                lines: account.lines,
              }
            : null,
        items: [blankItem()],
        adjustments: [],
        tax: { enabled: false, label: "GST", rate: "18" },
        notes: settings.defaultNotes,
        presentation: {
          templateId: settings.defaultTemplateId,
          templateVersion: 1,
          paperSize: settings.defaultPaperSize,
        },
      }
      const row = db.transaction(
        (tx) => {
          const created = newDraft(tx, auth, doc, settings)
          log(
            tx,
            auth,
            created,
            "invoice.created",
            `Created draft ${created.number} for ${client.name}`
          )
          return created
        },
        { behavior: "immediate" }
      )
      return toDetail(row, issueDate)
    },

    save(
      auth: AuthContext,
      id: string,
      input: SaveInvoiceInput
    ): InvoiceDetail {
      const ws = auth.workspaceId
      const row = load(ws, id)
      if (row.deletedAt)
        throw new ApiError(409, "DELETED", "This invoice was discarded")
      const mode = editMode(row.status)
      if (mode === "readonly") {
        throw new ApiError(
          409,
          "READ_ONLY",
          `A ${row.status.toLowerCase()} invoice cannot be edited`
        )
      }
      const doc = mode === "manual" ? assertIssuable(input.doc) : input.doc
      const settings = workspaceOf(ws).settings

      return db.transaction(
        (tx) => {
          const repo = invoicesRepo(tx)
          if (doc.number !== row.number) {
            if (repo.numberTaken(ws, doc.number, row.id)) {
              throw new ApiError(
                409,
                "NUMBER_TAKEN",
                `Invoice number ${doc.number} is already used`,
                {
                  "doc.number": "Already used",
                }
              )
            }
            const counter = parseCounter(
              settings.numbering,
              doc.issueDate,
              doc.number
            )
            if (counter !== null)
              repo.raiseSequence(
                ws,
                periodKey(settings.numbering, doc.issueDate),
                counter
              )
          }
          const patch: Partial<InvoiceRow> = {
            ...rowFromDoc(doc),
            updatedAt: deps.now().toISOString(),
          }
          if (mode === "manual") {
            const revision = row.revision + 1
            patch.revision = revision
            repo.insertRevision(ws, row.id, {
              revision,
              data: doc,
              totalMinor: patch.totalMinor ?? row.totalMinor,
              note: input.changeNote || null,
              createdAt: deps.now().toISOString(),
            })
            log(
              tx,
              auth,
              row,
              "invoice.edited",
              `Saved revision ${revision} of ${doc.number}`
            )
          }
          repo.update(ws, row.id, patch)
          const updated = repo.get(ws, row.id)
          if (!updated) throw notFound("Invoice")
          return toDetail(updated, todayFor(ws))
        },
        { behavior: "immediate" }
      )
    },

    issue(auth: AuthContext, id: string): InvoiceDetail {
      const ws = auth.workspaceId
      const row = load(ws, id)
      if (row.deletedAt)
        throw new ApiError(409, "DELETED", "This invoice was discarded")
      const status = applyTransition(row.status, "issue")
      const doc = assertIssuable(row.data)
      return db.transaction((tx) => {
        const repo = invoicesRepo(tx)
        repo.update(ws, id, {
          status,
          revision: 1,
          updatedAt: deps.now().toISOString(),
        })
        repo.insertRevision(ws, id, {
          revision: 1,
          data: doc,
          totalMinor: row.totalMinor,
          note: "Issued",
          createdAt: deps.now().toISOString(),
        })
        log(tx, auth, row, "invoice.issued", `Issued ${row.number}`)
        const updated = repo.get(ws, id)
        if (!updated) throw notFound("Invoice")
        return toDetail(updated, todayFor(ws))
      })
    },

    pay(auth: AuthContext, id: string, input: PayInput): InvoiceDetail {
      const ws = auth.workspaceId
      const row = load(ws, id)
      const status = applyTransition(row.status, "markPaid")
      return db.transaction((tx) => {
        const repo = invoicesRepo(tx)
        repo.update(ws, id, {
          status,
          paidAt: input.paidDate,
          paidNote: input.note || null,
          updatedAt: deps.now().toISOString(),
        })
        log(tx, auth, row, "invoice.paid", `Marked ${row.number} as paid`)
        const updated = repo.get(ws, id)
        if (!updated) throw notFound("Invoice")
        return toDetail(updated, todayFor(ws))
      })
    },

    reopen(auth: AuthContext, id: string): InvoiceDetail {
      const ws = auth.workspaceId
      const row = load(ws, id)
      const status = applyTransition(row.status, "reopen")
      return db.transaction((tx) => {
        const repo = invoicesRepo(tx)
        repo.update(ws, id, {
          status,
          paidAt: null,
          paidNote: null,
          updatedAt: deps.now().toISOString(),
        })
        log(tx, auth, row, "invoice.reopened", `Reopened ${row.number}`)
        const updated = repo.get(ws, id)
        if (!updated) throw notFound("Invoice")
        return toDetail(updated, todayFor(ws))
      })
    },

    cancel(auth: AuthContext, id: string, input: CancelInput): InvoiceDetail {
      const ws = auth.workspaceId
      const row = load(ws, id)
      const status = applyTransition(row.status, "cancel")
      return db.transaction((tx) => {
        const repo = invoicesRepo(tx)
        const stamp = deps.now().toISOString()
        repo.update(ws, id, {
          status,
          cancelledAt: stamp,
          cancelReason: input.reason || null,
          updatedAt: stamp,
        })
        log(tx, auth, row, "invoice.cancelled", `Cancelled ${row.number}`)
        const updated = repo.get(ws, id)
        if (!updated) throw notFound("Invoice")
        return toDetail(updated, todayFor(ws))
      })
    },

    duplicate(auth: AuthContext, id: string): InvoiceDetail {
      const ws = auth.workspaceId
      const source = load(ws, id)
      const workspace = workspaceOf(ws)
      const settings = workspace.settings
      const issueDate = todayIn(workspace.timezone, deps.now())
      const client = clientsRepo(db).get(ws, source.clientId)
      const dueDays = client?.defaultDueDays ?? settings.defaultDueDays
      const doc: InvoiceDoc = {
        ...source.data,
        issueDate,
        dueDate:
          source.data.dueDate === null ? null : addDays(issueDate, dueDays),
        items: source.data.items.map((item) => ({
          ...item,
          id: newId(),
          children: item.children.map((c) => ({ ...c, id: newId() })),
        })),
        adjustments: source.data.adjustments.map((a) => ({
          ...a,
          id: newId(),
        })),
      }
      const row = db.transaction(
        (tx) => {
          const created = newDraft(tx, auth, doc, settings)
          log(
            tx,
            auth,
            created,
            "invoice.duplicated",
            `Duplicated ${source.number} as ${created.number}`
          )
          return created
        },
        { behavior: "immediate" }
      )
      return toDetail(row, issueDate)
    },

    discard(auth: AuthContext, id: string): InvoiceDetail {
      const ws = auth.workspaceId
      const row = load(ws, id)
      if (row.status !== "DRAFT")
        throw new ApiError(
          409,
          "INVALID_TRANSITION",
          "Only drafts can be discarded"
        )
      if (row.deletedAt) throw new ApiError(409, "DELETED", "Already discarded")
      return db.transaction((tx) => {
        const repo = invoicesRepo(tx)
        const stamp = deps.now().toISOString()
        repo.update(ws, id, { deletedAt: stamp, updatedAt: stamp })
        log(tx, auth, row, "invoice.deleted", `Discarded draft ${row.number}`)
        const updated = repo.get(ws, id)
        if (!updated) throw notFound("Invoice")
        return toDetail(updated, todayFor(ws))
      })
    },

    restore(auth: AuthContext, id: string): InvoiceDetail {
      const ws = auth.workspaceId
      const row = load(ws, id)
      if (!row.deletedAt)
        throw new ApiError(
          409,
          "NOT_DELETED",
          "This invoice is not in the trash"
        )
      return db.transaction((tx) => {
        const repo = invoicesRepo(tx)
        repo.update(ws, id, {
          deletedAt: null,
          updatedAt: deps.now().toISOString(),
        })
        log(tx, auth, row, "invoice.restored", `Restored draft ${row.number}`)
        const updated = repo.get(ws, id)
        if (!updated) throw notFound("Invoice")
        return toDetail(updated, todayFor(ws))
      })
    },

    revisions(ws: string, id: string) {
      load(ws, id)
      return invoicesRepo(db)
        .listRevisions(ws, id)
        .map((r) => ({
          revision: r.revision,
          totalMinor: r.totalMinor,
          note: r.note,
          createdAt: r.createdAt,
        }))
    },

    revision(ws: string, id: string, revision: number) {
      load(ws, id)
      const row = invoicesRepo(db).getRevision(ws, id, revision)
      if (!row) throw notFound("Revision")
      return {
        revision: row.revision,
        totalMinor: row.totalMinor,
        note: row.note,
        createdAt: row.createdAt,
        doc: row.data,
      }
    },

    /** Preview of the next auto number (does not consume it). */
    nextNumberPreview(
      ws: string,
      numbering: NumberingSettings | undefined,
      date: string | undefined
    ) {
      const workspace = workspaceOf(ws)
      const effective = numbering ?? workspace.settings.numbering
      const issueDate = date ?? todayIn(workspace.timezone, deps.now())
      const last = invoicesRepo(db).lastSequence(
        ws,
        periodKey(effective, issueDate)
      )
      return { number: previewNextNumber(effective, issueDate, last) }
    },

    numberAvailable(ws: string, number: string, exceptId?: string): boolean {
      return !invoicesRepo(db).numberTaken(ws, number, exceptId)
    },
  }
}

export type InvoiceService = ReturnType<typeof createInvoiceService>

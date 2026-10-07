import { daysBetween } from "./dates"
import type { InvoiceStatus } from "./schema"

export type TransitionAction = "issue" | "markPaid" | "reopen" | "cancel"

const TRANSITIONS: Record<
  TransitionAction,
  { from: InvoiceStatus; to: InvoiceStatus }
> = {
  issue: { from: "DRAFT", to: "ISSUED" },
  markPaid: { from: "ISSUED", to: "PAID" },
  reopen: { from: "PAID", to: "ISSUED" },
  cancel: { from: "ISSUED", to: "CANCELLED" },
}

export class LifecycleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LifecycleError"
  }
}

export function canTransition(
  status: InvoiceStatus,
  action: TransitionAction
): boolean {
  return TRANSITIONS[action].from === status
}

export function transition(
  status: InvoiceStatus,
  action: TransitionAction
): InvoiceStatus {
  const rule = TRANSITIONS[action]
  if (rule.from !== status) {
    throw new LifecycleError(`Cannot ${action} an invoice that is ${status}`)
  }
  return rule.to
}

export type EditMode = "autosave" | "manual" | "readonly"

/** DRAFT autosaves, ISSUED saves explicitly with a revision, the rest is read-only. */
export function editMode(status: InvoiceStatus): EditMode {
  if (status === "DRAFT") return "autosave"
  return status === "ISSUED" ? "manual" : "readonly"
}

/** Only drafts can be discarded (soft delete). */
export function canDiscard(status: InvoiceStatus): boolean {
  return status === "DRAFT"
}

export interface OverdueInput {
  status: InvoiceStatus
  dueDate: string | null
}

export function isOverdue(inv: OverdueInput, today: string): boolean {
  return inv.status === "ISSUED" && inv.dueDate !== null && inv.dueDate < today
}

export type AgingBucket = "notDue" | "1-30" | "31-60" | "61+"
export const AGING_BUCKETS: AgingBucket[] = ["notDue", "1-30", "31-60", "61+"]

/** Aging of an unpaid issued invoice; null when it is not outstanding. */
export function agingBucket(
  inv: OverdueInput,
  today: string
): AgingBucket | null {
  if (inv.status !== "ISSUED") return null
  if (inv.dueDate === null || !isOverdue(inv, today)) return "notDue"
  const days = daysBetween(inv.dueDate, today)
  if (days <= 30) return "1-30"
  return days <= 60 ? "31-60" : "61+"
}

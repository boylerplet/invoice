import { describe, expect, it } from "vitest"
import {
  agingBucket,
  canDiscard,
  canTransition,
  editMode,
  isOverdue,
  LifecycleError,
  transition,
  type TransitionAction,
} from "./lifecycle"
import type { InvoiceStatus } from "./schema"

const STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "PAID", "CANCELLED"]
const ALLOWED: [TransitionAction, InvoiceStatus, InvoiceStatus][] = [
  ["issue", "DRAFT", "ISSUED"],
  ["markPaid", "ISSUED", "PAID"],
  ["reopen", "PAID", "ISSUED"],
  ["cancel", "ISSUED", "CANCELLED"],
]

describe("transition table", () => {
  for (const [action, from, to] of ALLOWED) {
    it(`${action}: ${from} -> ${to} only`, () => {
      for (const status of STATUSES) {
        if (status === from) {
          expect(transition(status, action)).toBe(to)
          expect(canTransition(status, action)).toBe(true)
        } else {
          expect(() => transition(status, action)).toThrow(LifecycleError)
          expect(canTransition(status, action)).toBe(false)
        }
      }
    })
  }
  it("edit modes and discard", () => {
    expect(editMode("DRAFT")).toBe("autosave")
    expect(editMode("ISSUED")).toBe("manual")
    expect(editMode("PAID")).toBe("readonly")
    expect(editMode("CANCELLED")).toBe("readonly")
    expect(canDiscard("DRAFT")).toBe(true)
    expect(canDiscard("ISSUED")).toBe(false)
  })
})

describe("overdue and aging", () => {
  const today = "2026-06-30"
  it("is overdue only when issued and past due", () => {
    expect(isOverdue({ status: "ISSUED", dueDate: "2026-06-29" }, today)).toBe(
      true
    )
    expect(isOverdue({ status: "ISSUED", dueDate: "2026-06-30" }, today)).toBe(
      false
    )
    expect(isOverdue({ status: "ISSUED", dueDate: null }, today)).toBe(false)
    expect(isOverdue({ status: "PAID", dueDate: "2026-01-01" }, today)).toBe(
      false
    )
    expect(isOverdue({ status: "DRAFT", dueDate: "2026-01-01" }, today)).toBe(
      false
    )
  })
  it("buckets by days past due", () => {
    const b = (dueDate: string | null) =>
      agingBucket({ status: "ISSUED", dueDate }, today)
    expect(b("2026-07-05")).toBe("notDue")
    expect(b(null)).toBe("notDue")
    expect(b("2026-06-29")).toBe("1-30")
    expect(b("2026-05-31")).toBe("1-30")
    expect(b("2026-05-30")).toBe("31-60")
    expect(b("2026-05-01")).toBe("31-60")
    expect(b("2026-04-30")).toBe("61+")
    expect(
      agingBucket({ status: "PAID", dueDate: "2026-01-01" }, today)
    ).toBeNull()
  })
})

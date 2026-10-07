import { describe, expect, it } from "vitest"
import {
  blankItem,
  canAddChild,
  canAddItem,
  cloneItem,
  removeItem,
  reorder,
  suggestPaymentAccount,
} from "./docOps"
import type { PaymentAccountDto } from "./dto"
import { child, item } from "./test-helpers"

const counter = () => {
  let n = 0
  return () => `n${++n}`
}

describe("docOps", () => {
  it("creates blank items with a pricing mode and no quantity", () => {
    const blank = blankItem(counter())
    expect(blank).toMatchObject({
      id: "n1",
      pricing: "explicit",
      qty: null,
      rate: null,
      children: [],
    })
  })

  it("clones an item with fresh ids for it and its children", () => {
    const source = item({ id: "a", children: [child({ id: "b" })] })
    const copy = cloneItem(source, counter())
    expect(copy.id).toBe("n1")
    expect(copy.children[0]?.id).toBe("n2")
    expect(source.id).toBe("a")
  })

  it("reorders without mutating and ignores no-op moves", () => {
    const list = ["a", "b", "c", "d"]
    expect(reorder(list, 0, 2)).toEqual(["b", "c", "a", "d"])
    expect(reorder(list, 3, 0)).toEqual(["d", "a", "b", "c"])
    expect(reorder(list, 1, 1)).toEqual(list)
    expect(reorder(list, 9, 0)).toEqual(list)
    expect(list).toEqual(["a", "b", "c", "d"])
  })

  it("keeps one blank item when the last is removed", () => {
    const only = item({ id: "x" })
    const result = removeItem([only], "x", counter())
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("n1")
    expect(removeItem([only, item({ id: "y" })], "x")).toHaveLength(1)
  })

  it("enforces item and child limits", () => {
    expect(
      canAddItem({ items: Array.from({ length: 199 }, () => item()) })
    ).toBe(true)
    expect(
      canAddItem({ items: Array.from({ length: 200 }, () => item()) })
    ).toBe(false)
    expect(
      canAddChild({ children: Array.from({ length: 20 }, () => child()) })
    ).toBe(false)
  })

  it("suggests payment accounts by preference, currency and profile", () => {
    const account = (over: Partial<PaymentAccountDto>): PaymentAccountDto => ({
      id: "a",
      issuerProfileId: null,
      label: "x",
      currency: "INR",
      kind: "bank",
      lines: [],
      archivedAt: null,
      ...over,
    })
    const accounts = [
      account({ id: "usd", currency: "USD" }),
      account({ id: "other", issuerProfileId: "p2" }),
      account({ id: "mine", issuerProfileId: "p1" }),
      account({ id: "old", archivedAt: "2026-01-01" }),
    ]
    expect(
      suggestPaymentAccount(accounts, "INR", ["old", null], "p1")?.id
    ).toBe("mine")
    expect(suggestPaymentAccount(accounts, "INR", ["mine"], "p1")?.id).toBe(
      "mine"
    )
    expect(suggestPaymentAccount(accounts, "USD", [], "p1")?.id).toBe("usd")
    expect(suggestPaymentAccount([], "INR", [], "p1")).toBeUndefined()
  })
})

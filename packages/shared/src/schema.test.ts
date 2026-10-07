import { describe, expect, it } from "vitest"
import { invoiceDocSchema, itemSchema } from "./schema"
import { child, doc, item } from "./test-helpers"

describe("invoiceDocSchema", () => {
  it("accepts a valid doc", () => {
    expect(invoiceDocSchema.safeParse(doc()).success).toBe(true)
  })
  it("requires at least one item", () => {
    expect(invoiceDocSchema.safeParse(doc({ items: [] })).success).toBe(false)
  })
  it("rejects explicit without rate", () => {
    expect(itemSchema.safeParse(item({ rate: null })).success).toBe(false)
  })
  it("rejects rollup child with qty but no rate", () => {
    const bad = item({
      pricing: "rollup",
      rate: null,
      children: [child({ qty: "2", rate: null })],
    })
    expect(itemSchema.safeParse(bad).success).toBe(false)
  })
  it("accepts rollup children with no qty or no rate", () => {
    const ok = item({
      pricing: "rollup",
      rate: null,
      children: [child({ rate: 100 }), child()],
    })
    expect(itemSchema.safeParse(ok).success).toBe(true)
  })
  it("limits children to 20 and one level", () => {
    const many = Array.from({ length: 21 }, () => child())
    expect(itemSchema.safeParse(item({ children: many })).success).toBe(false)
    const nested = { ...item(), children: [{ ...child(), children: [child()] }] }
    const parsed = itemSchema.parse(nested)
    expect(parsed.children[0]).not.toHaveProperty("children")
  })
  it("validates qty decimals, minor integers and dates", () => {
    expect(itemSchema.safeParse(item({ qty: "1.2345" })).success).toBe(false)
    expect(itemSchema.safeParse(item({ rate: 10.5 })).success).toBe(false)
    expect(
      invoiceDocSchema.safeParse(doc({ issueDate: "2026-02-30" })).success
    ).toBe(false)
  })
  it("limits text lengths", () => {
    expect(
      itemSchema.safeParse(item({ description: "x".repeat(201) })).success
    ).toBe(false)
    expect(
      invoiceDocSchema.safeParse(doc({ notes: "x".repeat(801) })).success
    ).toBe(false)
  })
})

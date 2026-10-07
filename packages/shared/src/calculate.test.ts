import { describe, expect, it } from "vitest"
import { calculate } from "./calculate"
import { adjustment, child, doc, item } from "./test-helpers"

describe("item amounts", () => {
  it("explicit with qty = qty x rate", () => {
    const calc = calculate(doc({ items: [item({ qty: "2.5", rate: 40_000 })] }))
    expect(calc.items[0]?.amount).toBe(100_000)
  })
  it("explicit without qty is a flat charge (amount = rate)", () => {
    const calc = calculate(doc({ items: [item({ qty: null, rate: 55_000 })] }))
    expect(calc.items[0]?.amount).toBe(55_000)
  })
  it("rollup sums children; unpriced children contribute nothing", () => {
    const parent = item({
      pricing: "rollup",
      qty: null,
      rate: null,
      children: [
        child({ qty: "12", rate: 5_000 }),
        child({ rate: 20_000 }),
        child({ description: "note only" }),
      ],
    })
    const calc = calculate(doc({ items: [parent] }))
    expect(calc.items[0]?.amount).toBe(80_000)
    expect(calc.items[0]?.children.map((c) => c.amount)).toEqual([
      60_000,
      20_000,
      null,
    ])
  })
  it("rollup with no priced child has no amount", () => {
    const parent = item({ pricing: "rollup", rate: null, children: [child()] })
    expect(calculate(doc({ items: [parent] })).items[0]?.amount).toBeNull()
  })
  it("none has no amounts at all", () => {
    const parent = item({
      pricing: "none",
      rate: 9_999,
      children: [child({ rate: 100 })],
    })
    const calc = calculate(doc({ items: [parent] }))
    expect(calc.items[0]?.amount).toBeNull()
    expect(calc.subtotal).toBe(0)
  })
  it("explicit children are descriptive and never double counted", () => {
    const parent = item({
      pricing: "explicit",
      rate: 100_000,
      children: [child({ rate: 40_000 }), child({ qty: "2", rate: 10_000 })],
    })
    const calc = calculate(doc({ items: [parent] }))
    expect(calc.items[0]?.children.every((c) => c.amount === null)).toBe(true)
    expect(calc.subtotal).toBe(100_000)
  })
  it("rollup parent rate is ignored and not added on top of children", () => {
    const parent = item({
      pricing: "rollup",
      rate: 77_700,
      children: [child({ rate: 10_000 })],
    })
    expect(calculate(doc({ items: [parent] })).subtotal).toBe(10_000)
  })
})

describe("totals", () => {
  const base = [item({ rate: 100_000 }), item({ rate: 50_000 })]
  it("subtotal, percent discount, fixed charge, tax", () => {
    const calc = calculate(
      doc({
        items: base,
        adjustments: [
          adjustment({ kind: "discount", valueType: "percent", value: "10" }),
          adjustment({ kind: "charge", valueType: "fixed", value: "5000" }),
        ],
        tax: { enabled: true, label: "GST", rate: "18" },
      })
    )
    expect(calc.subtotal).toBe(150_000)
    expect(calc.adjustments.map((a) => a.amount)).toEqual([-15_000, 5_000])
    expect(calc.taxable).toBe(140_000)
    expect(calc.taxAmount).toBe(25_200)
    expect(calc.total).toBe(165_200)
  })
  it("percent adjustments never compound", () => {
    const calc = calculate(
      doc({
        items: [item({ rate: 100_000 })],
        adjustments: [
          adjustment({ valueType: "percent", value: "10" }),
          adjustment({ valueType: "percent", value: "10" }),
        ],
      })
    )
    expect(calc.adjustments.map((a) => a.amount)).toEqual([-10_000, -10_000])
  })
  it("flags negative taxable amounts", () => {
    const calc = calculate(
      doc({
        items: [item({ rate: 1_000 })],
        adjustments: [adjustment({ value: "5000" })],
      })
    )
    expect(calc.taxableNegative).toBe(true)
    expect(calc.taxAmount).toBe(0)
  })
  it("no tax when disabled", () => {
    const calc = calculate(
      doc({ tax: { enabled: false, label: "GST", rate: "18" } })
    )
    expect(calc.taxAmount).toBe(0)
    expect(calc.total).toBe(calc.subtotal)
  })
  it("is deterministic", () => {
    const d = doc({ items: base })
    expect(calculate(d)).toEqual(calculate(d))
  })
})

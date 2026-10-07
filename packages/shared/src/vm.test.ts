import { describe, expect, it } from "vitest"
import { calculate } from "./calculate"
import { adjustment, child, doc, item } from "./test-helpers"
import { buildInvoiceVM, type SupportFlags } from "./vm"

const ALL: SupportFlags = {
  dueDate: true,
  reference: true,
  paymentTerms: true,
  notes: true,
  paymentDetails: true,
  tax: true,
  adjustments: true,
  logo: true,
}
const NONE: SupportFlags = {
  dueDate: false,
  reference: false,
  paymentTerms: false,
  notes: false,
  paymentDetails: false,
  tax: false,
  adjustments: false,
  logo: false,
}
const build = (d = doc(), supports = ALL) =>
  buildInvoiceVM(d, calculate(d), {
    supports,
    moneyDecimals: "always",
    status: "DRAFT",
    logoUrl: "/logo.png",
  })

describe("buildInvoiceVM", () => {
  it("leaves quantity empty for flat charges (never 1)", () => {
    const vm = build(doc({ items: [item({ qty: null, rate: 55_000 })] }))
    const row = vm.groups[0]?.rows[0]
    expect(row?.qty).toBeNull()
    expect(row?.amount).toBe("550.00")
    expect(vm.hasQty).toBe(false)
    expect(vm.hasRate).toBe(true)
  })
  it("formats qty without unit and ignores unit without qty", () => {
    const vm = build(
      doc({
        items: [
          item({ qty: "12.0", unit: "hrs", rate: 5_000 }),
          item({ qty: null, unit: "hrs" }),
        ],
      })
    )
    expect(vm.groups[0]?.rows[0]).toMatchObject({
      qty: "12",
      unit: "hrs",
      amount: "600.00",
    })
    expect(vm.groups[1]?.rows[0]?.unit).toBeNull()
    expect(vm.hasQty).toBe(true)
  })
  it("flattens rollup groups with child amounts", () => {
    const vm = build(
      doc({
        items: [
          item({
            pricing: "rollup",
            rate: null,
            children: [child({ qty: "2", rate: 10_000 }), child()],
          }),
        ],
      })
    )
    const rows = vm.groups[0]?.rows ?? []
    expect(rows.map((r) => r.kind)).toEqual(["item", "child", "child"])
    expect(rows[0]).toMatchObject({
      isGroupParent: true,
      qty: null,
      rate: null,
      amount: "200.00",
    })
    expect(rows[1]).toMatchObject({ qty: "2", rate: "100.00", amount: "200.00" })
    expect(rows[2]?.amount).toBeNull()
  })
  it("hides fee fields of children in explicit mode", () => {
    const vm = build(
      doc({ items: [item({ children: [child({ qty: "3", rate: 5_000 })] })] })
    )
    expect(vm.groups[0]?.rows[1]).toMatchObject({
      qty: null,
      rate: null,
      amount: null,
    })
  })
  it("applies supports flags", () => {
    const d = doc({
      dueDate: "2026-05-01",
      reference: "PO-1",
      notes: "n",
      paymentTerms: "t",
      tax: { enabled: true, label: "GST", rate: "18" },
      adjustments: [adjustment({ value: "100" })],
    })
    const vm = build(d, NONE)
    expect(vm).toMatchObject({
      dueDate: null,
      reference: null,
      notes: null,
      paymentTerms: null,
      tax: null,
      adjustments: [],
      payment: null,
    })
    expect(vm.issuer.logoUrl).toBeNull()
    expect(build(d).issuer.logoUrl).toBe("/logo.png")
  })
  it("formats totals; total carries the symbol, discounts are negative", () => {
    const vm = build(
      doc({
        items: [item({ rate: 1_000_000 })],
        adjustments: [adjustment({ value: "50000" })],
        tax: { enabled: true, label: "GST", rate: "18" },
      })
    )
    expect(vm.subtotal).toBe("10,000.00")
    expect(vm.adjustments[0]?.amount).toBe("−500.00")
    expect(vm.tax).toEqual({ label: "GST", rate: "18%", amount: "1,710.00" })
    expect(vm.total).toBe("₹11,210.00")
    expect(vm.issueDate).toBe("15 Apr 2026")
  })
})

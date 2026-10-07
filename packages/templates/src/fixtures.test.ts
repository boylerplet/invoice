import { calculate, invoiceDocSchema } from "@workspace/shared"
import { describe, expect, it } from "vitest"
import { fixtures } from "../fixtures"
import { createVm } from "./createVm"
import { requireTemplate } from "./registry"

describe("fixtures", () => {
  it("has the required scenarios", () => {
    expect(fixtures.map((f) => f.id)).toEqual([
      "minimal-1-item", "typical-5-items", "with-notes-and-payment", "nested-priced-rollup",
      "nested-descriptive-explicit", "nested-mixed-priced-unpriced", "flat-no-qty", "long-descriptions",
      "forty-items-multipage", "big-group-spanning-pages", "tax-and-adjustments", "usd-letter",
      "no-due-date-no-reference", "terminal-just-overflows-page", "max-length-fields",
    ])
  })

  for (const fixture of fixtures) {
    it(`${fixture.id} is a valid, issuable invoice`, () => {
      const parsed = invoiceDocSchema.safeParse(fixture.doc)
      expect(parsed.error?.issues ?? []).toEqual([])
      expect(calculate(fixture.doc).taxableNegative).toBe(false)
    })

    it(`${fixture.id} builds a view model`, () => {
      const template = requireTemplate("studio")
      const vm = createVm(fixture.doc, template.manifest, { logoUrl: null })
      expect(vm.groups.length).toBe(fixture.doc.items.length)
      expect(vm.total).toMatch(/^[₹$]/)
    })
  }

  it("never shows a quantity of 1 for flat charges", () => {
    const flat = fixtures.find((f) => f.id === "flat-no-qty")
    const vm = createVm(flat!.doc, requireTemplate("studio").manifest, { logoUrl: null })
    expect(vm.hasQty).toBe(false)
    expect(vm.groups.every((g) => g.rows.every((r) => r.qty === null))).toBe(true)
  })
})

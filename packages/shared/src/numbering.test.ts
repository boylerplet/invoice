import { describe, expect, it } from "vitest"
import {
  allocateNumber,
  DEFAULT_NUMBERING,
  formatNumber,
  isValidManualNumber,
  parseCounter,
  periodKey,
  previewNextNumber,
  type NumberingSettings,
} from "./numbering"

const S = DEFAULT_NUMBERING
const withOver = (over: Partial<NumberingSettings>): NumberingSettings => ({
  ...S,
  ...over,
})

describe("formatNumber", () => {
  it("calendar year default", () => {
    expect(formatNumber(S, "2026-04-15", 1)).toBe("INV-2026-0001")
  })
  it("financial year", () => {
    const fy = withOver({ period: "financial" })
    expect(formatNumber(fy, "2026-04-15", 1)).toBe("INV-26-27-0001")
    expect(formatNumber(fy, "2026-03-31", 1)).toBe("INV-25-26-0001")
    expect(formatNumber(fy, "2026-04-01", 1)).toBe("INV-26-27-0001")
  })
  it("no period, custom separator", () => {
    expect(formatNumber(withOver({ period: "none" }), "2026-04-15", 7)).toBe(
      "INV-0007"
    )
    expect(formatNumber(withOver({ separator: "/" }), "2026-04-15", 7)).toBe(
      "INV/2026/0007"
    )
    expect(formatNumber(withOver({ separator: "" }), "2026-04-15", 7)).toBe(
      "INV20260007"
    )
  })
  it("padding is a minimum width only", () => {
    expect(formatNumber(S, "2026-04-15", 10_000)).toBe("INV-2026-10000")
  })
})

describe("period keys and allocation", () => {
  it("resets by period", () => {
    expect(periodKey(S, "2026-12-31")).toBe("2026")
    expect(periodKey(S, "2027-01-01")).toBe("2027")
    expect(periodKey(withOver({ period: "financial" }), "2026-03-31")).toBe(
      "2025"
    )
    expect(periodKey(withOver({ resetEachPeriod: false }), "2027-01-01")).toBe(
      "all"
    )
  })
  it("starts at startNumber and continues", () => {
    expect(
      allocateNumber(withOver({ startNumber: 50 }), "2026-01-01", 0, () => false)
        .counter
    ).toBe(50)
    expect(allocateNumber(S, "2026-01-01", 4, () => false).number).toBe(
      "INV-2026-0005"
    )
  })
  it("skips taken numbers and never reuses", () => {
    const taken = new Set(["INV-2026-0005", "INV-2026-0006"])
    const a = allocateNumber(S, "2026-01-01", 4, (n) => taken.has(n))
    expect(a.number).toBe("INV-2026-0007")
    expect(a.counter).toBe(7)
  })
  it("previews", () => {
    expect(previewNextNumber(S, "2026-04-15")).toBe("INV-2026-0001")
  })
})

describe("manual numbers", () => {
  it("validates characters and length", () => {
    expect(isValidManualNumber("ACME/2026_01-a")).toBe(true)
    expect(isValidManualNumber("bad number")).toBe(false)
    expect(isValidManualNumber("x".repeat(33))).toBe(false)
    expect(isValidManualNumber("")).toBe(false)
  })
  it("extracts the counter only for the current pattern", () => {
    expect(parseCounter(S, "2026-04-15", "INV-2026-0042")).toBe(42)
    expect(parseCounter(S, "2026-04-15", "INV-2025-0042")).toBeNull()
    expect(parseCounter(S, "2026-04-15", "CUSTOM-1")).toBeNull()
  })
})

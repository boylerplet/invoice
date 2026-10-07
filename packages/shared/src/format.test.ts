import Big from "big.js"
import { describe, expect, it } from "vitest"
import { addDays, daysBetween, todayIn } from "./dates"
import { formatDate, formatMoney, formatQty, parseMoneyInput } from "./format"
import { multiplyQty, percentOf, toMinor } from "./money"

describe("formatMoney", () => {
  it("uses Indian grouping for INR", () => {
    expect(formatMoney(10_000_000, "INR")).toBe("₹1,00,000.00")
    expect(formatMoney(123_456_789, "INR")).toBe("₹12,34,567.89")
    expect(formatMoney(99_900, "INR")).toBe("₹999.00")
    expect(formatMoney(100_000, "INR")).toBe("₹1,000.00")
    expect(formatMoney(5, "INR")).toBe("₹0.05")
  })
  it("uses Western grouping for USD", () => {
    expect(formatMoney(10_000_000, "USD")).toBe("$100,000.00")
    expect(formatMoney(123_456_789, "USD")).toBe("$1,234,567.89")
  })
  it("supports auto decimals, no symbol and negatives", () => {
    expect(formatMoney(150_000, "INR", { decimals: "auto" })).toBe("₹1,500")
    expect(formatMoney(150_050, "INR", { decimals: "auto" })).toBe("₹1,500.50")
    expect(formatMoney(150_000, "INR", { symbol: false })).toBe("1,500.00")
    expect(formatMoney(-150_000, "INR")).toBe("−₹1,500.00")
  })
})

describe("parseMoneyInput", () => {
  it("parses common inputs", () => {
    expect(parseMoneyInput("1,00,000.5", "INR")).toEqual({
      ok: true,
      value: 10_000_050,
    })
    expect(parseMoneyInput("100000", "INR")).toEqual({
      ok: true,
      value: 10_000_000,
    })
    expect(parseMoneyInput("$1,200", "USD")).toEqual({
      ok: true,
      value: 120_000,
    })
    expect(parseMoneyInput("₹ 99.99", "INR")).toEqual({ ok: true, value: 9_999 })
  })
  it("rejects bad input", () => {
    expect(parseMoneyInput("", "INR").ok).toBe(false)
    expect(parseMoneyInput("abc", "INR").ok).toBe(false)
    expect(parseMoneyInput("1.234", "INR").ok).toBe(false)
    expect(parseMoneyInput("-5", "INR").ok).toBe(false)
  })
})

describe("rounding", () => {
  it("rounds half up", () => {
    expect(toMinor(new Big("0.5"))).toBe(1)
    expect(toMinor(new Big("1.5"))).toBe(2)
    expect(toMinor(new Big("2.4999"))).toBe(2)
    expect(multiplyQty("2.5", 101)).toBe(253)
    expect(percentOf(1_050, "18")).toBe(189)
  })
})

describe("dates and formatters", () => {
  it("formats", () => {
    expect(formatDate("2026-04-15")).toBe("15 Apr 2026")
    expect(formatQty("2.50")).toBe("2.5")
    expect(formatQty("12.000")).toBe("12")
  })
  it("does date math", () => {
    expect(addDays("2026-02-27", 3)).toBe("2026-03-02")
    expect(daysBetween("2026-04-01", "2026-05-01")).toBe(30)
  })
  it("resolves today in a timezone", () => {
    const now = new Date("2026-03-31T20:00:00Z")
    expect(todayIn("Asia/Kolkata", now)).toBe("2026-04-01")
    expect(todayIn("America/New_York", now)).toBe("2026-03-31")
  })
})

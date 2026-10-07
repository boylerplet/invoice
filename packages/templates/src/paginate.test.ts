import { describe, expect, it } from "vitest"
import { paginate, PaginationError, type PaginateInput, type Unit } from "./paginate"

/** Page body: 1000 - footer 50 - header(first 100 / cont 40) - intro 100 - head 30 - safety 0. */
const base = (over: Partial<PaginateInput> = {}): PaginateInput => ({
  contentHeight: 1000,
  footerHeight: 50,
  headerHeight: { first: 100, continuation: 40 },
  introHeight: 100,
  tableHeadHeight: 30,
  units: [],
  continuedHeight: {},
  terminalHeight: 100,
  options: { keepLastRowsWithTerminal: 1, safety: 0 },
  ...over,
})
// first-page rows capacity = 1000-50-100-100-30 = 720; continuation = 1000-50-40-30 = 880

const row = (id: string, height: number, over: Partial<Unit> = {}): Unit => ({
  id,
  groupId: id,
  height,
  kind: "item",
  isFirstInGroup: true,
  ...over,
})
const rows = (count: number, height: number) => Array.from({ length: count }, (_, i) => row(`r${i}`, height))

describe("paginate: filling pages", () => {
  it("puts a short invoice on one page with the terminal", () => {
    const plan = paginate(base({ units: rows(3, 50) }))
    expect(plan).toHaveLength(1)
    expect(plan[0]).toMatchObject({ pageNumber: 1, variant: "first", unitIds: ["r0", "r1", "r2"], hasTerminal: true })
  })

  it("fits exactly at the boundary, and breaks one pixel over", () => {
    // 720 capacity: 6 rows x 100 + terminal needs 100 more -> use 5 x 124 = 620 (+100 terminal = 720 exactly)
    const exact = paginate(base({ units: rows(5, 124) }))
    expect(exact).toHaveLength(1)
    const over = paginate(base({ units: rows(5, 124.2) }))
    expect(over).toHaveLength(2)
    expect(over[1]?.hasTerminal).toBe(true)
  })

  it("starts a new page when a row is one pixel too tall", () => {
    const plan = paginate(base({ units: [row("a", 720), row("b", 1), row("c", 1)], terminalHeight: 10 }))
    expect(plan.map((p) => p.unitIds)).toEqual([["a"], ["b", "c"]])
    expect(plan[1]?.variant).toBe("continuation")
  })

  it("accepts a row that exactly fills the page", () => {
    const plan = paginate(base({ units: [row("a", 720)], terminalHeight: 0 }))
    expect(plan).toHaveLength(1)
    expect(plan[0]?.unitIds).toEqual(["a"])
  })

  it("uses different capacity for the first and later pages", () => {
    const plan = paginate(base({ units: rows(40, 100), terminalHeight: 10 }))
    expect(plan[0]?.unitIds).toHaveLength(7) // 720 / 100
    expect(plan[1]?.unitIds).toHaveLength(8) // 880 / 100
    expect(plan.map((p) => p.variant)).toEqual(["first", "continuation", "continuation", "continuation", "continuation", "continuation"])
  })

  it("handles 1 and 200 items", () => {
    expect(paginate(base({ units: rows(1, 40) }))).toHaveLength(1)
    const many = paginate(base({ units: rows(200, 37.25), terminalHeight: 60 }))
    expect(many.flatMap((p) => p.unitIds)).toHaveLength(200)
    expect(many.at(-1)?.hasTerminal).toBe(true)
    expect(many.filter((p) => p.hasTerminal)).toHaveLength(1)
  })

  it("keeps order, never repeats or drops a unit", () => {
    const units = rows(57, 63)
    const plan = paginate(base({ units }))
    expect(plan.flatMap((p) => p.unitIds)).toEqual(units.map((u) => u.id))
  })

  it("subtracts the safety margin", () => {
    const tight = paginate(base({ units: [row("a", 719.5)], terminalHeight: 0 }))
    expect(tight).toHaveLength(1)
    const safe = paginate(base({ units: [row("a", 719.5)], terminalHeight: 0, options: { keepLastRowsWithTerminal: 1, safety: 1 } }))
    expect(safe).toHaveLength(2)
  })
})

describe("paginate: groups", () => {
  const group = (id: string, n: number, h: number): Unit[] =>
    Array.from({ length: n }, (_, i) =>
      row(`${id}-${i}`, h, { groupId: id, kind: i === 0 ? "item" : "child", isFirstInGroup: i === 0 })
    )

  it("keeps a parent merged with its first child (one unit) so they never split", () => {
    // The merged unit is one 100px unit: it moves whole to the next page.
    const plan = paginate(base({ units: [row("filler", 650), ...group("g", 2, 100)], terminalHeight: 10 }))
    expect(plan[0]?.unitIds).toEqual(["filler"])
    expect(plan[1]?.unitIds).toEqual(["g-0", "g-1"])
  })

  it("repeats the parent line when a group continues on the next page", () => {
    const units = group("g", 20, 100)
    const plan = paginate(base({ units, continuedHeight: { g: 30 }, terminalHeight: 10 }))
    expect(plan[0]?.continuedGroupId).toBeNull()
    expect(plan[1]?.continuedGroupId).toBe("g")
    // page 2 rows capacity 880 - 30 reserved = 850 -> 8 rows
    expect(plan[1]?.unitIds).toHaveLength(8)
  })

  it("does not reserve a continued line when the option is off (height 0)", () => {
    const plan = paginate(base({ units: group("g", 20, 100), continuedHeight: { g: 0 }, terminalHeight: 10 }))
    expect(plan[1]?.continuedGroupId).toBeNull()
    expect(plan[1]?.unitIds).toHaveLength(8)
  })

  it("does not repeat the parent for a group that starts on the new page", () => {
    const units = [row("filler", 700), ...group("g", 3, 50)]
    const plan = paginate(base({ units, continuedHeight: { g: 30 }, terminalHeight: 10 }))
    expect(plan[1]?.continuedGroupId).toBeNull()
  })
})

describe("paginate: terminal placement", () => {
  it("keeps the terminal on the last page when it fits", () => {
    const plan = paginate(base({ units: [row("a", 600)], terminalHeight: 120 }))
    expect(plan).toHaveLength(1)
    expect(plan[0]?.hasTerminal).toBe(true)
  })

  it("moves the last rows with the terminal when it just overflows", () => {
    const units = rows(7, 100) // 700 of 720 used, terminal 100 does not fit
    const plan = paginate(base({ units, terminalHeight: 100, options: { keepLastRowsWithTerminal: 2, safety: 0 } }))
    expect(plan).toHaveLength(2)
    expect(plan[0]?.unitIds).toEqual(["r0", "r1", "r2", "r3", "r4"])
    expect(plan[1]).toMatchObject({ unitIds: ["r5", "r6"], hasTerminal: true, variant: "continuation" })
  })

  it("moves at least one row so the totals never sit alone", () => {
    const plan = paginate(base({ units: rows(7, 100), terminalHeight: 100, options: { keepLastRowsWithTerminal: 0, safety: 0 } }))
    expect(plan.at(-1)?.unitIds.length).toBeGreaterThanOrEqual(1)
  })

  it("moves a single-row invoice's row with the terminal, leaving page 1 without rows", () => {
    const plan = paginate(base({ units: [row("only", 700)], terminalHeight: 100 }))
    expect(plan).toHaveLength(2)
    expect(plan[0]).toMatchObject({ unitIds: [], hasTerminal: false })
    expect(plan[1]).toMatchObject({ unitIds: ["only"], hasTerminal: true })
  })

  it("puts the terminal alone only as a last resort", () => {
    const plan = paginate(base({ units: [row("a", 870)], terminalHeight: 200 }))
    expect(plan.at(-1)).toMatchObject({ hasTerminal: true })
    expect(plan.flatMap((p) => p.unitIds)).toEqual(["a"])
  })

  it("carries a continued line along with moved rows that belong to a split group", () => {
    const units: Unit[] = Array.from({ length: 8 }, (_, i) =>
      row(`g-${i}`, 100, { groupId: "g", kind: i === 0 ? "item" : "child", isFirstInGroup: i === 0 })
    )
    const plan = paginate(base({ units, continuedHeight: { g: 30 }, terminalHeight: 100, options: { keepLastRowsWithTerminal: 2, safety: 0 } }))
    const last = plan.at(-1)
    expect(last?.hasTerminal).toBe(true)
    if (last && last.unitIds[0] !== "g-0") expect(last.continuedGroupId).toBe("g")
  })
})

describe("paginate: errors and determinism", () => {
  it("throws for a row taller than an empty page", () => {
    expect(() => paginate(base({ units: [row("huge", 881)] }))).toThrow(PaginationError)
    expect(() => paginate(base({ units: [row("huge", 881)] }))).toThrow(/taller than an empty page/)
  })

  it("throws for a terminal taller than a page", () => {
    expect(() => paginate(base({ units: rows(1, 10), terminalHeight: 2000 }))).toThrow(PaginationError)
  })

  it("is deterministic", () => {
    const input = base({ units: rows(31, 77), continuedHeight: {}, terminalHeight: 140 })
    expect(paginate(input)).toEqual(paginate(structuredClone(input)))
  })
})

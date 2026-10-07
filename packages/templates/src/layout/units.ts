import type { InvoiceVM, RowVM } from "../contract"
import type { Unit } from "../paginate"

export interface LayoutUnit extends Unit {
  /** Rows rendered for this unit: [item + first child] or a single row. */
  rows: RowVM[]
}

/** Groups become paginate() units: an item merges with its first child; later children stand alone. */
export function buildUnits(vm: InvoiceVM): LayoutUnit[] {
  const units: LayoutUnit[] = []
  for (const group of vm.groups) {
    const [item, firstChild, ...others] = group.rows
    if (!item) continue
    units.push({
      id: item.id,
      groupId: group.id,
      height: 0,
      kind: "item",
      isFirstInGroup: true,
      rows: firstChild ? [item, firstChild] : [item],
    })
    for (const child of others) {
      units.push({ id: child.id, groupId: group.id, height: 0, kind: "child", isFirstInGroup: false, rows: [child] })
    }
  }
  return units
}

/** The repeated parent line shown at the top of a page when a group continues. */
export function continuedRow(parent: RowVM): RowVM {
  return { ...parent, kind: "continued", detail: null, qty: null, unit: null, rate: null, amount: null, isGroupParent: true }
}

/** Last row id of every group, so templates can close a group with a rule. */
export function lastRowIds(vm: InvoiceVM): Set<string> {
  return new Set(vm.groups.flatMap((g) => (g.rows.length > 0 ? [g.rows[g.rows.length - 1]?.id ?? ""] : [])))
}

import type { CSSProperties } from "react"
import type { ColumnSpec, InvoiceVM, TemplateManifest } from "../contract"

/** qty / rate columns with `hideWhenEmpty` disappear when no row uses them. */
export function visibleColumns(manifest: TemplateManifest, vm: InvoiceVM): ColumnSpec[] {
  return manifest.columns.filter((col) => {
    if (!col.hideWhenEmpty) return true
    if (col.key === "qty") return vm.hasQty
    if (col.key === "rate") return vm.hasRate
    return true
  })
}

export const gridTemplate = (columns: ColumnSpec[]): string => columns.map((c) => c.width).join(" ")

/** Inline custom properties set on the template root: manifest tokens plus the column grid. */
export function rootVars(manifest: TemplateManifest, columns: ColumnSpec[]): CSSProperties {
  return { ...manifest.tokens, "--tpl-cols": gridTemplate(columns) } as CSSProperties
}

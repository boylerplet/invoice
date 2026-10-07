import type { FC } from "react"
import type { RowProps, TableHeadProps } from "../../../../contract"

const alignStyle = (align: "left" | "center" | "right") => ({ textAlign: align })

export const TableHead: FC<TableHeadProps> = ({ columns }) => (
  <div className="thead">
    {columns.map((col) => (
      <div key={col.key} className="label" style={alignStyle(col.align)}>
        {col.label}
      </div>
    ))}
  </div>
)

export const Row: FC<RowProps> = ({ row, columns, isLastInGroup }) => {
  const isChild = row.kind === "child"
  const isContinued = row.kind === "continued"
  const classes = ["row"]
  if (isChild) classes.push("row--child")
  if (isContinued) classes.push("row--continued")
  if (row.isGroupParent) classes.push("row--parent")
  // Rows inside a group are joined by the tree line; only the last row closes the group with a hairline.
  if (isChild && isLastInGroup) classes.push("row--last")
  if (!isChild && !isContinued && row.isGroupParent) classes.push("row--open")
  if (isChild && !isLastInGroup) classes.push("row--open")

  const qty = row.qty === null ? "" : row.unit ? `${row.qty} ${row.unit}` : row.qty

  return (
    <div className={classes.join(" ")}>
      {columns.map((col) => {
        switch (col.key) {
          case "description":
            return (
              <div key={col.key} className="row__desc">
                {row.description}
                {isContinued && " (continued)"}
                {row.detail && <div className="row__detail">{row.detail}</div>}
              </div>
            )
          case "qty":
            return (
              <div key={col.key} className="row__cell" style={alignStyle(col.align)}>
                {qty}
              </div>
            )
          case "rate":
            return (
              <div key={col.key} className="row__cell" style={alignStyle(col.align)}>
                {row.rate ?? ""}
              </div>
            )
          case "amount":
            return (
              <div key={col.key} className="row__amount" style={alignStyle(col.align)}>
                {row.amount ?? ""}
              </div>
            )
        }
      })}
    </div>
  )
}

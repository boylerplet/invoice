import type { CSSProperties, FC, ReactNode } from "react"
import {
  templateKey,
  type ColumnSpec,
  type InvoiceVM,
  type RowVM,
  type TemplateModule,
} from "../contract"
import { rootVars } from "./columns"

interface RootProps {
  template: TemplateModule
  columns: ColumnSpec[]
  style?: CSSProperties
  className?: string
  children: ReactNode
  [dataAttr: `data-${string}`]: string | number | undefined
}

/** Scope element: carries the template class and tokens. Used by pages and by the measure layer. */
export const TemplateRoot: FC<RootProps> = ({
  template,
  columns,
  style,
  className,
  children,
  ...rest
}) => (
  <div
    className={[templateKey(template.manifest), className]
      .filter(Boolean)
      .join(" ")}
    style={{ ...rootVars(template.manifest, columns), ...style }}
    {...rest}
  >
    {children}
  </div>
)

interface RowBlockProps {
  template: TemplateModule
  vm: InvoiceVM
  row: RowVM
  columns: ColumnSpec[]
  isFirstOnPage: boolean
  isLastOnPage: boolean
  isLastInGroup: boolean
}

/** A row wrapped in a flow-root box so its measured height equals its rendered height. */
export const RowBlock: FC<RowBlockProps> = ({
  template,
  vm,
  row,
  columns,
  isFirstOnPage,
  isLastOnPage,
  isLastInGroup,
}) => (
  <div style={{ display: "flow-root" }}>
    <template.Row
      vm={vm}
      row={row}
      columns={columns}
      isFirstOnPage={isFirstOnPage}
      isLastOnPage={isLastOnPage}
      isLastInGroup={isLastInGroup}
    />
  </div>
)

import type { FC } from "react"
import type { PageHeaderProps } from "../../../../contract"

const Meta: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="label">{label}</div>
    <div className="meta__value">{value}</div>
  </div>
)

export const PageHeader: FC<PageHeaderProps> = ({ vm, variant }) => {
  if (variant === "continuation") {
    return (
      <div className="hdr-cont-wrap">
        <div className="hdr-cont">
          <span className="hdr-cont__title">INVOICE</span>
          <span className="hdr-cont__number">{vm.number}</span>
          <span className="hdr-cont__spacer" />
          <span>{vm.issueDate}</span>
          <span>{vm.client.name}</span>
        </div>
      </div>
    )
  }
  const cells = [
    { label: "Invoice no.", value: vm.number },
    { label: "Issue date", value: vm.issueDate },
    vm.dueDate ? { label: "Due date", value: vm.dueDate } : null,
    vm.reference ? { label: "Reference", value: vm.reference } : null,
  ].filter((cell): cell is { label: string; value: string } => cell !== null)

  return (
    <header className="hdr-first">
      <div className="hdr-first__top">
        <div className="brand">
          {vm.issuer.logoUrl ? (
            <img
              className="brand__logo"
              src={vm.issuer.logoUrl}
              alt={vm.issuer.displayName}
            />
          ) : (
            <div className="brand__word">{vm.issuer.displayName}</div>
          )}
        </div>
        <div className="title-block">
          <div className="accent-bar" />
          <div className="title">INVOICE</div>
        </div>
      </div>
      <div className="meta">
        {cells.map((cell) => (
          <Meta key={cell.label} {...cell} />
        ))}
      </div>
    </header>
  )
}

import type { FC } from "react"
import type { PageFooterProps } from "../../../../contract"

export const PageFooter: FC<PageFooterProps> = ({ vm, pageNumber, pageCount }) => {
  const left = [vm.issuer.displayName, vm.issuer.email, vm.issuer.phone].filter(Boolean).join(" · ")
  return (
    <footer className="footer">
      <span className="footer__left">{left}</span>
      <span className="footer__page">
        Page {pageNumber} of {pageCount}
      </span>
    </footer>
  )
}

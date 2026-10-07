import type { FC } from "react"
import type { PageDecorationProps } from "../../../../contract"

/** A light quarter-circle outline in the top-right corner of the first page. */
export const PageDecoration: FC<PageDecorationProps> = ({ variant }) => {
  if (variant !== "first") return null
  return (
    <svg className="deco" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M0 0 A18 18 0 0 0 18 18"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.12"
        strokeWidth="0.4"
      />
    </svg>
  )
}

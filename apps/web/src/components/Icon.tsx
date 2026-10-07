import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"

interface IconProps {
  icon: IconSvgElement
  className?: string
}

/** Thin wrapper so every icon in the app shares stroke width and default size. */
export function Icon({ icon, className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={icon} strokeWidth={2} className={className} />
}

import { isPercentString, isQtyString } from "@workspace/shared"
import { useState } from "react"
import { Input } from "@workspace/ui/components/input"

interface DecimalInputProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  /** qty: up to 3 decimals; percent: 0 to 100. */
  kind: "qty" | "percent"
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  "aria-label"?: string
  className?: string
}

/** Typed value -> stored value: null when empty, undefined while the text is not (yet) valid. */
function interpret(
  text: string,
  kind: DecimalInputProps["kind"]
): string | null | undefined {
  const trimmed = text.trim()
  if (trimmed === "") return null
  const valid = kind === "qty" ? isQtyString(trimmed) : isPercentString(trimmed)
  return valid ? trimmed : undefined
}

/** A decimal kept as a string (never a float). Optional values store null when the field is empty. */
export function DecimalInput({
  value,
  onChange,
  kind,
  invalid,
  ...rest
}: DecimalInputProps) {
  const [text, setText] = useState(value ?? "")
  const current = interpret(text, kind)
  if (current !== undefined && current !== value) setText(value ?? "")

  return (
    <Input
      {...rest}
      inputMode="decimal"
      aria-invalid={invalid || current === undefined || undefined}
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        const result = interpret(next, kind)
        if (result !== undefined) onChange(result)
      }}
    />
  )
}

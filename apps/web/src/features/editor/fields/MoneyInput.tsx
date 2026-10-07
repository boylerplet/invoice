import {
  minorToInput,
  parseMoneyInput,
  type CurrencyCode,
  type Minor,
} from "@workspace/shared"
import { useState } from "react"
import { Input } from "@workspace/ui/components/input"

interface MoneyInputProps {
  id?: string
  value: Minor | null
  currency: CurrencyCode
  onChange: (value: Minor | null) => void
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  "aria-label"?: string
  className?: string
}

const toText = (value: Minor | null, currency: CurrencyCode) =>
  value === null ? "" : minorToInput(value, currency)

function parsed(
  text: string,
  currency: CurrencyCode
): Minor | null | undefined {
  if (text.trim() === "") return null
  const result = parseMoneyInput(text, currency)
  return result.ok ? result.value : undefined
}

/**
 * Edits an amount in minor units as text in major units ("1,00,000.50").
 * The text is only replaced when the value changes from outside; typing never fights the cursor.
 */
export function MoneyInput({
  value,
  currency,
  onChange,
  invalid,
  ...rest
}: MoneyInputProps) {
  const [text, setText] = useState(() => toText(value, currency))
  const current = parsed(text, currency)
  if (current !== undefined && current !== value)
    setText(toText(value, currency))

  return (
    <Input
      {...rest}
      inputMode="decimal"
      aria-invalid={invalid || current === undefined || undefined}
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        const result = parsed(next, currency)
        if (result !== undefined) onChange(result)
      }}
      onBlur={() => {
        if (current !== undefined) setText(toText(current, currency))
      }}
    />
  )
}

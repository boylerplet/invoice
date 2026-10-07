import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

export interface Option<T extends string = string> {
  value: T
  label: string
}

interface SelectFieldProps<T extends string> {
  id?: string
  /** Accessible name when no visible <label> points at the control. */
  label?: string
  value: T | null
  onChange: (value: T) => void
  options: Option<T>[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

/** A controlled select over a plain option list. */
export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled,
  className,
}: SelectFieldProps<T>) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next !== null && onChange(next as T)}
      items={options}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={className ?? "w-full"}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

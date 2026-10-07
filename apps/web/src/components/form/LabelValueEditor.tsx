import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import type { LabelValue } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Icon } from "@/components/Icon"

interface Props {
  value: LabelValue[]
  onChange: (next: LabelValue[]) => void
  labelPlaceholder?: string
  valuePlaceholder?: string
  addLabel: string
  reorderable?: boolean
  max?: number
}

/** Ordered list of label + value pairs (tax IDs, payment details lines). */
export function LabelValueEditor({
  value,
  onChange,
  labelPlaceholder = "Label",
  valuePlaceholder = "Value",
  addLabel,
  reorderable = false,
  max = 12,
}: Props) {
  const update = (index: number, patch: Partial<LabelValue>) =>
    onChange(
      value.map((line, i) => (i === index ? { ...line, ...patch } : line))
    )
  const move = (index: number, by: -1 | 1) => {
    const next = [...value]
    const target = index + by
    const moved = next[index]
    const other = next[target]
    if (!moved || !other) return
    next[index] = other
    next[target] = moved
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {value.map((line, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            aria-label={`${labelPlaceholder} ${index + 1}`}
            className="w-2/5"
            placeholder={labelPlaceholder}
            value={line.label}
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <Input
            aria-label={`${valuePlaceholder} ${index + 1}`}
            className="flex-1"
            placeholder={valuePlaceholder}
            value={line.value}
            onChange={(e) => update(index, { value: e.target.value })}
          />
          {reorderable && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <Icon icon={ArrowUp01Icon} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Move down"
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                <Icon icon={ArrowDown01Icon} />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove line"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Icon icon={Delete02Icon} />
          </Button>
        </div>
      ))}
      {value.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, { label: "", value: "" }])}
        >
          <Icon icon={Add01Icon} /> {addLabel}
        </Button>
      )}
    </div>
  )
}

/** Drops lines the user left blank. */
export const cleanLines = (lines: LabelValue[]): LabelValue[] =>
  lines.filter((line) => line.label.trim() !== "" || line.value.trim() !== "")

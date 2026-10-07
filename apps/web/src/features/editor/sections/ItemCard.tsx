import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  Add01Icon,
} from "@hugeicons/core-free-icons"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  blankChild,
  canAddChild,
  reorder,
  type Child,
  type CurrencyCode,
  type Item,
  type Minor,
  type Pricing,
} from "@workspace/shared"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { Icon } from "@/components/Icon"
import { Field } from "@/components/form/Field"
import { money } from "@/lib/format"
import { DecimalInput } from "../fields/DecimalInput"
import { MoneyInput } from "../fields/MoneyInput"

const MODES: { value: Pricing; label: string }[] = [
  { value: "explicit", label: "Fixed amount" },
  { value: "rollup", label: "Breakdown of charges" },
  { value: "none", label: "Description only" },
]

interface ItemCardProps {
  item: Item
  index: number
  count: number
  currency: CurrencyCode
  amount: Minor | null
  childAmounts: (Minor | null)[]
  disabled: boolean
  error: (path: string) => string | undefined
  onChange: (next: Item) => void
  onDuplicate: () => void
  onRemove: () => void
  onMove: (by: -1 | 1) => void
}

function Amount({ value, currency, label }: { value: Minor | null; currency: CurrencyCode; label: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="flex h-9 items-center justify-end px-1 text-sm font-medium tabular-nums" data-testid="line-amount">
        {value === null ? "—" : money(value, currency)}
      </p>
    </div>
  )
}

function ChildRow(props: {
  child: Child
  index: number
  total: number
  currency: CurrencyCode
  priced: boolean
  amount: Minor | null
  disabled: boolean
  error: (path: string) => string | undefined
  onChange: (next: Child) => void
  onRemove: () => void
  onMove: (by: -1 | 1) => void
}) {
  const { child, index, total, currency, priced, amount, disabled, error, onChange, onRemove, onMove } = props
  return (
    <div className="border-border/70 ml-3 space-y-2 border-l pl-3">
      <div className="flex items-center gap-2">
        <Input aria-label={`Breakdown line ${index + 1} description`} placeholder="Line description" disabled={disabled} value={child.description} onChange={(e) => onChange({ ...child, description: e.target.value })} />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Move line up" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
          <Icon icon={ArrowUp01Icon} />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Move line down" disabled={disabled || index === total - 1} onClick={() => onMove(1)}>
          <Icon icon={ArrowDown01Icon} />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove line" disabled={disabled} onClick={onRemove}>
          <Icon icon={Delete02Icon} />
        </Button>
      </div>
      {priced && (
        <div className="grid grid-cols-[1fr_1fr_1.4fr_1.4fr] gap-2">
          <DecimalInput kind="qty" aria-label={`Line ${index + 1} quantity`} placeholder="Qty (optional)" disabled={disabled} value={child.qty} onChange={(qty) => onChange({ ...child, qty, unit: qty === null ? null : child.unit })} />
          <Input aria-label={`Line ${index + 1} unit`} placeholder="Unit" disabled={disabled || child.qty === null} value={child.unit ?? ""} onChange={(e) => onChange({ ...child, unit: e.target.value || null })} />
          <MoneyInput aria-label={`Line ${index + 1} rate`} placeholder="Rate (optional)" currency={currency} disabled={disabled} invalid={Boolean(error(`rate`))} value={child.rate} onChange={(rate) => onChange({ ...child, rate })} />
          <p className="flex h-9 items-center justify-end px-1 text-sm tabular-nums">{amount === null ? "—" : money(amount, currency)}</p>
        </div>
      )}
    </div>
  )
}

export function ItemCard(props: ItemCardProps) {
  const { item, index, count, currency, amount, childAmounts, disabled, error, onChange, onDuplicate, onRemove, onMove } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled })
  const [showDetail, setShowDetail] = useState(item.detail !== null)
  const base = `items.${index}`
  const setChildren = (children: Child[]) => onChange({ ...item, children })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("bg-card space-y-3 rounded-xl border p-3", isDragging && "opacity-60 shadow-lg")}
      data-testid="item-card"
    >
      <div className="flex items-center gap-2">
        <button type="button" className="text-muted-foreground cursor-grab touch-none p-1" aria-label={`Drag item ${index + 1}`} disabled={disabled} {...attributes} {...listeners}>
          <Icon icon={DragDropVerticalIcon} />
        </button>
        <span className="text-muted-foreground text-xs font-medium tabular-nums">#{index + 1}</span>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Move item up" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
          <Icon icon={ArrowUp01Icon} />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Move item down" disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
          <Icon icon={ArrowDown01Icon} />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Duplicate item" disabled={disabled} onClick={onDuplicate}>
          <Icon icon={Copy01Icon} />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete item" disabled={disabled} onClick={onRemove}>
          <Icon icon={Delete02Icon} />
        </Button>
      </div>

      <Field label="Description" htmlFor={`${item.id}-desc`} error={error(`${base}.description`)}>
        <Input id={`${item.id}-desc`} placeholder="What was done" disabled={disabled} value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} />
      </Field>
      {showDetail ? (
        <Field label="Detail line" htmlFor={`${item.id}-detail`}>
          <Input id={`${item.id}-detail`} placeholder="Optional second line" disabled={disabled} value={item.detail ?? ""} onChange={(e) => onChange({ ...item, detail: e.target.value || null })} />
        </Field>
      ) : (
        !disabled && (
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setShowDetail(true)}>
            Add detail line
          </Button>
        )
      )}

      <div role="group" aria-label="Pricing" className="bg-muted inline-flex rounded-lg p-0.5">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            disabled={disabled}
            aria-pressed={item.pricing === mode.value}
            onClick={() => onChange({ ...item, pricing: mode.value })}
            className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", item.pricing === mode.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {item.pricing === "explicit" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Quantity" htmlFor={`${item.id}-qty`} hint="Leave empty for a flat charge.">
            <DecimalInput id={`${item.id}-qty`} kind="qty" placeholder="—" disabled={disabled} value={item.qty} onChange={(qty) => onChange({ ...item, qty, unit: qty === null ? null : item.unit })} />
          </Field>
          <Field label="Unit" htmlFor={`${item.id}-unit`}>
            <Input id={`${item.id}-unit`} placeholder="hrs" disabled={disabled || item.qty === null} value={item.unit ?? ""} onChange={(e) => onChange({ ...item, unit: e.target.value || null })} />
          </Field>
          <Field label="Rate" htmlFor={`${item.id}-rate`} error={error(`${base}.rate`)}>
            <MoneyInput id={`${item.id}-rate`} currency={currency} disabled={disabled} invalid={Boolean(error(`${base}.rate`))} value={item.rate} onChange={(rate) => onChange({ ...item, rate })} />
          </Field>
          <Amount label="Amount" value={amount} currency={currency} />
        </div>
      )}
      {item.pricing === "rollup" && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total of the lines below</span>
          <span className="font-medium tabular-nums" data-testid="line-amount">
            {amount === null ? "—" : money(amount, currency)}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {item.children.map((child, i) => (
          <ChildRow
            key={child.id}
            child={child}
            index={i}
            total={item.children.length}
            currency={currency}
            priced={item.pricing === "rollup"}
            amount={childAmounts[i] ?? null}
            disabled={disabled}
            error={(path) => error(`${base}.children.${i}.${path}`)}
            onChange={(next) => setChildren(item.children.map((c) => (c.id === child.id ? next : c)))}
            onRemove={() => setChildren(item.children.filter((c) => c.id !== child.id))}
            onMove={(by) => setChildren(reorder(item.children, i, i + by))}
          />
        ))}
        {!disabled && canAddChild(item) && (
          <Button type="button" variant="outline" size="sm" onClick={() => setChildren([...item.children, blankChild()])}>
            <Icon icon={Add01Icon} /> Add breakdown line
          </Button>
        )}
      </div>
    </div>
  )
}

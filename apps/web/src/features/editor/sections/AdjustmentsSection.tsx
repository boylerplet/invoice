import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { blankAdjustment, type Adjustment } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Icon } from "@/components/Icon"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { DecimalInput } from "../fields/DecimalInput"
import { MoneyInput } from "../fields/MoneyInput"
import type { SectionProps } from "./types"

function AdjustmentRow({ adjustment, index, props, onChange, onRemove }: { adjustment: Adjustment; index: number; props: SectionProps; onChange: (a: Adjustment) => void; onRemove: () => void }) {
  const { doc, disabled, error } = props
  const fixed = adjustment.valueType === "fixed"
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <Input aria-label={`Adjustment ${index + 1} label`} placeholder="Label" disabled={disabled} value={adjustment.label} onChange={(e) => onChange({ ...adjustment, label: e.target.value })} />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove adjustment" disabled={disabled} onClick={onRemove}>
          <Icon icon={Delete02Icon} />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SelectField
          disabled={disabled}
          value={adjustment.kind}
          onChange={(kind) => onChange({ ...adjustment, kind })}
          options={[{ value: "discount", label: "Discount" }, { value: "charge", label: "Extra charge" }]}
        />
        <SelectField
          disabled={disabled}
          value={adjustment.valueType}
          onChange={(valueType) => onChange({ ...adjustment, valueType, value: "0" })}
          options={[{ value: "percent", label: "Percent (%)" }, { value: "fixed", label: `Amount (${doc.currency})` }]}
        />
        {fixed ? (
          <MoneyInput
            aria-label={`Adjustment ${index + 1} amount`}
            currency={doc.currency}
            disabled={disabled}
            invalid={Boolean(error(`adjustments.${index}.value`))}
            value={Number(adjustment.value)}
            onChange={(v) => onChange({ ...adjustment, value: String(v ?? 0) })}
          />
        ) : (
          <DecimalInput aria-label={`Adjustment ${index + 1} percent`} kind="percent" disabled={disabled} invalid={Boolean(error(`adjustments.${index}.value`))} value={adjustment.value} onChange={(v) => onChange({ ...adjustment, value: v ?? "0" })} />
        )}
      </div>
      {error(`adjustments.${index}.value`) && <p className="text-destructive text-xs">{error(`adjustments.${index}.value`)}</p>}
    </div>
  )
}

export function AdjustmentsSection(props: SectionProps) {
  const { doc, update, error, supports, disabled } = props
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Discounts and extra charges</h3>
        {!supports.adjustments && <p className="text-muted-foreground text-xs">This template does not print adjustments, so they are hidden from the document.</p>}
        {doc.adjustments.map((adjustment, index) => (
          <AdjustmentRow
            key={adjustment.id}
            adjustment={adjustment}
            index={index}
            props={props}
            onChange={(next) => update((d) => ({ ...d, adjustments: d.adjustments.map((a) => (a.id === adjustment.id ? next : a)) }))}
            onRemove={() => update((d) => ({ ...d, adjustments: d.adjustments.filter((a) => a.id !== adjustment.id) }))}
          />
        ))}
        {!disabled && doc.adjustments.length < 10 && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => update((d) => ({ ...d, adjustments: [...d.adjustments, blankAdjustment("discount")] }))}>
              <Icon icon={Add01Icon} /> Add discount
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => update((d) => ({ ...d, adjustments: [...d.adjustments, blankAdjustment("charge")] }))}>
              <Icon icon={Add01Icon} /> Add charge
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={doc.tax.enabled} disabled={disabled || !supports.tax} onCheckedChange={(enabled) => update((d) => ({ ...d, tax: { ...d.tax, enabled } }))} />
          Add tax
        </label>
        {!supports.tax && <p className="text-muted-foreground text-xs">This template does not print a tax line.</p>}
        {doc.tax.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tax label" htmlFor="tax-label">
              <Input id="tax-label" disabled={disabled} value={doc.tax.label} onChange={(e) => update((d) => ({ ...d, tax: { ...d.tax, label: e.target.value } }))} />
            </Field>
            <Field label="Rate (%)" htmlFor="tax-rate" error={error("tax.rate")}>
              <DecimalInput id="tax-rate" kind="percent" disabled={disabled} invalid={Boolean(error("tax.rate"))} value={doc.tax.rate} onChange={(rate) => update((d) => ({ ...d, tax: { ...d.tax, rate: rate ?? "0" } }))} />
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}

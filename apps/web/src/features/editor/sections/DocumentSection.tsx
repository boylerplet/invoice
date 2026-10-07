import { CURRENCIES, CURRENCY_CODES, dueDateFromDays } from "@workspace/shared"
import {
  latestVersion,
  listTemplates,
  templateThumbnail,
} from "@workspace/templates"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { api } from "@/lib/api"
import type { SectionProps } from "./types"

const DUE_PRESETS = [
  { label: "On receipt", days: 0 },
  { label: "7 days", days: 7 },
  { label: "15 days", days: 15 },
  { label: "30 days", days: 30 },
]

function NumberField({
  doc,
  update,
  error,
  disabled,
  invoiceId,
}: SectionProps & { invoiceId: string }) {
  const [editing, setEditing] = useState(false)
  const check = useQuery({
    queryKey: ["number-available", doc.number, invoiceId],
    enabled: editing,
    queryFn: () =>
      api.get<{ available: boolean }>(
        `/invoices/check-number?number=${encodeURIComponent(doc.number)}&exceptId=${invoiceId}`
      ),
  })
  const taken = editing && check.data?.available === false
  return (
    <Field
      label="Invoice number"
      htmlFor="doc-number"
      error={
        error("number") ?? (taken ? "This number is already used" : undefined)
      }
      hint={
        editing
          ? "Letters, digits, / _ - only, up to 32 characters."
          : "Generated automatically and never reused."
      }
    >
      <div className="flex gap-2">
        <Input
          id="doc-number"
          value={doc.number}
          readOnly={!editing}
          disabled={disabled}
          aria-invalid={taken || undefined}
          onChange={(e) => update((d) => ({ ...d, number: e.target.value }))}
        />
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Done" : "Edit number"}
          </Button>
        )}
      </div>
    </Field>
  )
}

export function DocumentSection(props: SectionProps & { invoiceId: string }) {
  const { doc, update, error, supports, disabled } = props
  const templates = listTemplates().filter(
    (t) => t.version === latestVersion(t.id)
  )

  return (
    <div className="space-y-4">
      <Field label="Template">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {templates.map((t) => {
            const selected = doc.presentation.templateId === t.id
            const thumb = templateThumbnail(t.id, t.version)
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() =>
                  update((d) => ({
                    ...d,
                    presentation: {
                      ...d.presentation,
                      templateId: t.id,
                      templateVersion: t.version,
                    },
                  }))
                }
                className={cn(
                  "overflow-hidden rounded-lg border text-left text-sm transition-colors",
                  selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "hover:border-foreground/30"
                )}
              >
                <div className="aspect-[3/2] overflow-hidden bg-muted">
                  {thumb && (
                    <img
                      src={thumb}
                      alt=""
                      className="w-full object-cover object-top"
                    />
                  )}
                </div>
                <div className="px-2 py-1.5 font-medium">{t.name}</div>
              </button>
            )
          })}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paper size" htmlFor="doc-paper">
          <SelectField
            id="doc-paper"
            disabled={disabled}
            value={doc.presentation.paperSize}
            onChange={(paperSize) =>
              update((d) => ({
                ...d,
                presentation: { ...d.presentation, paperSize },
              }))
            }
            options={[
              { value: "A4", label: "A4" },
              { value: "LETTER", label: "Letter" },
            ]}
          />
        </Field>
        <Field label="Currency" htmlFor="doc-currency">
          <SelectField
            id="doc-currency"
            disabled={disabled}
            value={doc.currency}
            onChange={(currency) => update((d) => ({ ...d, currency }))}
            options={CURRENCY_CODES.map((code) => ({
              value: code,
              label: `${code} (${CURRENCIES[code].symbol})`,
            }))}
          />
        </Field>
      </div>
      <NumberField {...props} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Issue date"
          htmlFor="doc-issue"
          error={error("issueDate")}
        >
          <Input
            id="doc-issue"
            type="date"
            disabled={disabled}
            value={doc.issueDate}
            onChange={(e) =>
              e.target.value &&
              update((d) => ({ ...d, issueDate: e.target.value }))
            }
          />
        </Field>
        <Field
          label="Due date"
          htmlFor="doc-due"
          error={error("dueDate")}
          hint={
            supports.dueDate
              ? undefined
              : "This template does not print a due date."
          }
        >
          <Input
            id="doc-due"
            type="date"
            disabled={disabled || !supports.dueDate}
            value={doc.dueDate ?? ""}
            onChange={(e) =>
              update((d) => ({ ...d, dueDate: e.target.value || null }))
            }
          />
        </Field>
      </div>
      {supports.dueDate && !disabled && (
        <div className="flex flex-wrap gap-2">
          {DUE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update((d) => ({
                  ...d,
                  dueDate: dueDateFromDays(d.issueDate, preset.days),
                }))
              }
            >
              {preset.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => update((d) => ({ ...d, dueDate: null }))}
          >
            No due date
          </Button>
        </div>
      )}
      <Field
        label="Reference"
        htmlFor="doc-reference"
        error={error("reference")}
        hint={
          supports.reference
            ? "PO or project reference."
            : "This template does not print a reference."
        }
      >
        <Input
          id="doc-reference"
          disabled={disabled || !supports.reference}
          value={doc.reference ?? ""}
          onChange={(e) =>
            update((d) => ({ ...d, reference: e.target.value || null }))
          }
        />
      </Field>
      <Field
        label="Payment terms"
        htmlFor="doc-terms"
        error={error("paymentTerms")}
        hint={
          supports.paymentTerms
            ? undefined
            : "This template does not print payment terms."
        }
      >
        <Input
          id="doc-terms"
          disabled={disabled || !supports.paymentTerms}
          value={doc.paymentTerms ?? ""}
          onChange={(e) =>
            update((d) => ({ ...d, paymentTerms: e.target.value || null }))
          }
        />
      </Field>
    </div>
  )
}

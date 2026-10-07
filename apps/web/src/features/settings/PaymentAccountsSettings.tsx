import {
  Add01Icon,
  Archive02Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import {
  CURRENCY_CODES,
  paymentAccountInputSchema,
  type PaymentAccountDto,
  type PaymentAccountInput,
} from "@workspace/shared"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Icon } from "@/components/Icon"
import { EditSheet } from "@/components/form/EditSheet"
import { Field } from "@/components/form/Field"
import {
  cleanLines,
  LabelValueEditor,
} from "@/components/form/LabelValueEditor"
import { payloadResolver } from "@/components/form/payloadResolver"
import { SelectField } from "@/components/form/SelectField"
import { applyServerErrors } from "@/components/form/useFormErrors"
import { EmptyState } from "@/components/PageHeader"
import {
  useAccounts,
  useArchiveAccount,
  useProfiles,
  useSaveAccount,
} from "@/lib/queries"

interface Values {
  issuerProfileId: string
  label: string
  currency: PaymentAccountInput["currency"]
  kind: PaymentAccountInput["kind"]
  lines: PaymentAccountInput["lines"]
}

const ALL_PROFILES = "all"

interface Preset {
  name: string
  kind: PaymentAccountInput["kind"]
  currency: PaymentAccountInput["currency"]
  lines: string[]
}

const PRESETS: Preset[] = [
  {
    name: "Indian bank (INR)",
    kind: "bank",
    currency: "INR",
    lines: ["A/C holder name", "A/C number", "IFSC", "Bank", "Branch"],
  },
  { name: "UPI", kind: "upi", currency: "INR", lines: ["UPI ID"] },
  {
    name: "International (USD)",
    kind: "bank",
    currency: "USD",
    lines: [
      "Beneficiary",
      "Account number",
      "SWIFT / BIC",
      "Bank",
      "Bank address",
    ],
  },
]

const toPayload = (v: Values): PaymentAccountInput => ({
  issuerProfileId:
    v.issuerProfileId === ALL_PROFILES ? null : v.issuerProfileId,
  label: v.label,
  currency: v.currency,
  kind: v.kind,
  lines: cleanLines(v.lines),
})

const toValues = (a?: PaymentAccountDto): Values => ({
  issuerProfileId: a?.issuerProfileId ?? ALL_PROFILES,
  label: a?.label ?? "",
  currency: a?.currency ?? "INR",
  kind: a?.kind ?? "bank",
  lines: a?.lines ?? [],
})

function AccountForm({
  account,
  onDone,
}: {
  account?: PaymentAccountDto
  onDone: () => void
}) {
  const profiles = useProfiles()
  const save = useSaveAccount()
  const form = useForm<Values>({
    defaultValues: toValues(account),
    resolver: payloadResolver(paymentAccountInputSchema, toPayload),
  })
  const errors = form.formState.errors
  const profileOptions = [
    { value: ALL_PROFILES, label: "All profiles" },
    ...(profiles.data ?? [])
      .filter((p) => !p.archivedAt)
      .map((p) => ({ value: p.id, label: p.displayName })),
  ]

  function applyPreset(preset: Preset) {
    form.setValue("kind", preset.kind)
    form.setValue("currency", preset.currency)
    form.setValue(
      "lines",
      preset.lines.map((label) => ({ label, value: "" }))
    )
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: account?.id, input: toPayload(values) })
      toast.success(account ? "Account saved" : "Account created")
      onDone()
    } catch (error) {
      applyServerErrors(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!account && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Start from a preset</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <Field
        label="Label"
        htmlFor="label"
        error={errors.label?.message}
        hint="For example: HDFC current - Menon Design Co."
      >
        <Input id="label" {...form.register("label")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Currency" htmlFor="currency">
          <Controller
            control={form.control}
            name="currency"
            render={({ field }) => (
              <SelectField
                id="currency"
                value={field.value}
                onChange={field.onChange}
                options={CURRENCY_CODES.map((c) => ({ value: c, label: c }))}
              />
            )}
          />
        </Field>
        <Field label="Type" htmlFor="kind">
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <SelectField
                id="kind"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "bank", label: "Bank" },
                  { value: "upi", label: "UPI" },
                  { value: "other", label: "Other" },
                ]}
              />
            )}
          />
        </Field>
      </div>
      <Field label="Used by" htmlFor="profile">
        <Controller
          control={form.control}
          name="issuerProfileId"
          render={({ field }) => (
            <SelectField
              id="profile"
              value={field.value}
              onChange={field.onChange}
              options={profileOptions}
            />
          )}
        />
      </Field>
      <Field label="Details printed on the invoice" hint="Shown in this order.">
        <Controller
          control={form.control}
          name="lines"
          render={({ field }) => (
            <LabelValueEditor
              value={field.value}
              onChange={field.onChange}
              addLabel="Add line"
              labelPlaceholder="Label"
              valuePlaceholder="Value"
              reorderable
            />
          )}
        />
      </Field>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save account"}
      </Button>
    </form>
  )
}

export function PaymentAccountsSettings() {
  const accounts = useAccounts()
  const profiles = useProfiles()
  const archive = useArchiveAccount()
  const [editing, setEditing] = useState<PaymentAccountDto | "new" | null>(null)
  const list = accounts.data ?? []
  const profileName = (id: string | null) =>
    id
      ? (profiles.data?.find((p) => p.id === id)?.displayName ?? "Unknown")
      : "All profiles"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Payment accounts</h2>
          <p className="text-sm text-muted-foreground">
            Where clients should pay. Printed on invoices as payment details.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Icon icon={Add01Icon} /> Add account
        </Button>
      </div>
      {list.length === 0 && !accounts.isPending && (
        <EmptyState
          title="No payment accounts yet"
          hint="Add a bank or UPI account to print payment details on invoices."
        />
      )}
      {list.map((a) => (
        <Card key={a.id} className={a.archivedAt ? "opacity-60" : undefined}>
          <CardContent className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{a.label}</p>
                <Badge variant="secondary">{a.currency}</Badge>
                {a.archivedAt && <Badge variant="outline">Archived</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {profileName(a.issuerProfileId)} · {a.lines.length} line(s)
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${a.label}`}
              onClick={() => setEditing(a)}
            >
              <Icon icon={PencilEdit02Icon} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={a.archivedAt ? "Restore account" : "Archive account"}
              onClick={() =>
                archive.mutate({ id: a.id, archived: Boolean(a.archivedAt) })
              }
            >
              <Icon icon={Archive02Icon} />
            </Button>
          </CardContent>
        </Card>
      ))}
      <EditSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={
          editing === "new" ? "New payment account" : "Edit payment account"
        }
      >
        {editing !== null && (
          <AccountForm
            key={editing === "new" ? "new" : editing.id}
            account={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </EditSheet>
    </div>
  )
}

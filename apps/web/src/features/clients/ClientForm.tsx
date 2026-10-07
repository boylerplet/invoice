import { CURRENCY_CODES, clientInputSchema, type ClientDto, type ClientInput } from "@workspace/shared"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field } from "@/components/form/Field"
import { cleanLines, LabelValueEditor } from "@/components/form/LabelValueEditor"
import { linesToText, payloadResolver, textToLines, toNull } from "@/components/form/payloadResolver"
import { SelectField } from "@/components/form/SelectField"
import { applyServerErrors } from "@/components/form/useFormErrors"
import { useAccounts, useProfiles, useSaveClient } from "@/lib/queries"

interface Values {
  name: string
  contactPerson: string
  addressLines: string
  email: string
  phone: string
  taxIds: ClientInput["taxIds"]
  defaultIssuerProfileId: string
  defaultPaymentAccountId: string
  defaultCurrency: string
  defaultDueDays: string
  notes: string
}

const NONE = "none"

const toPayload = (v: Values): ClientInput => ({
  name: v.name,
  contactPerson: toNull(v.contactPerson),
  addressLines: textToLines(v.addressLines),
  email: toNull(v.email),
  phone: toNull(v.phone),
  taxIds: cleanLines(v.taxIds),
  defaultIssuerProfileId: v.defaultIssuerProfileId === NONE ? null : v.defaultIssuerProfileId,
  defaultPaymentAccountId: v.defaultPaymentAccountId === NONE ? null : v.defaultPaymentAccountId,
  defaultCurrency: v.defaultCurrency === NONE ? null : (v.defaultCurrency as ClientInput["defaultCurrency"]),
  defaultDueDays: v.defaultDueDays.trim() === "" ? null : Number(v.defaultDueDays),
  notes: toNull(v.notes),
})

const toValues = (c?: ClientDto): Values => ({
  name: c?.name ?? "",
  contactPerson: c?.contactPerson ?? "",
  addressLines: linesToText(c?.addressLines ?? []),
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  taxIds: c?.taxIds ?? [],
  defaultIssuerProfileId: c?.defaultIssuerProfileId ?? NONE,
  defaultPaymentAccountId: c?.defaultPaymentAccountId ?? NONE,
  defaultCurrency: c?.defaultCurrency ?? NONE,
  defaultDueDays: c?.defaultDueDays === null || c?.defaultDueDays === undefined ? "" : String(c.defaultDueDays),
  notes: c?.notes ?? "",
})

interface Props {
  client?: ClientDto
  onSaved: (client: ClientDto) => void
}

export function ClientForm({ client, onSaved }: Props) {
  const profiles = useProfiles()
  const accounts = useAccounts()
  const save = useSaveClient()
  const form = useForm<Values>({ defaultValues: toValues(client), resolver: payloadResolver(clientInputSchema, toPayload) })
  const errors = form.formState.errors
  const profileOptions = [{ value: NONE, label: "Workspace default" }, ...(profiles.data ?? []).filter((p) => !p.archivedAt).map((p) => ({ value: p.id, label: p.displayName }))]
  const accountOptions = [{ value: NONE, label: "None" }, ...(accounts.data ?? []).filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: `${a.label} (${a.currency})` }))]

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: client?.id, input: toPayload(values) })
      toast.success(client ? "Client saved" : "Client created")
      onSaved(saved)
    } catch (error) {
      applyServerErrors(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Client name" htmlFor="client-name" error={errors.name?.message}>
        <Input id="client-name" autoFocus {...form.register("name")} />
      </Field>
      <Field label="Contact person" htmlFor="contact">
        <Input id="contact" {...form.register("contactPerson")} />
      </Field>
      <Field label="Address" htmlFor="client-address" hint="One line per row.">
        <Textarea id="client-address" rows={3} {...form.register("addressLines")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="client-email">
          <Input id="client-email" type="email" {...form.register("email")} />
        </Field>
        <Field label="Phone" htmlFor="client-phone">
          <Input id="client-phone" {...form.register("phone")} />
        </Field>
      </div>
      <Field label="Tax IDs" hint="Printed as plain information, for example GSTIN.">
        <Controller control={form.control} name="taxIds" render={({ field }) => <LabelValueEditor value={field.value} onChange={field.onChange} labelPlaceholder="GSTIN" valuePlaceholder="29AAACK5678M1Z2" addLabel="Add tax ID" max={6} />} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Invoice from" htmlFor="default-profile">
          <Controller control={form.control} name="defaultIssuerProfileId" render={({ field }) => <SelectField id="default-profile" value={field.value} onChange={field.onChange} options={profileOptions} />} />
        </Field>
        <Field label="Pay to" htmlFor="default-account">
          <Controller control={form.control} name="defaultPaymentAccountId" render={({ field }) => <SelectField id="default-account" value={field.value} onChange={field.onChange} options={accountOptions} />} />
        </Field>
        <Field label="Currency" htmlFor="default-currency">
          <Controller
            control={form.control}
            name="defaultCurrency"
            render={({ field }) => (
              <SelectField id="default-currency" value={field.value} onChange={field.onChange} options={[{ value: NONE, label: "Workspace default" }, ...CURRENCY_CODES.map((c) => ({ value: c as string, label: c }))]} />
            )}
          />
        </Field>
        <Field label="Due days" htmlFor="default-due" error={errors.defaultDueDays?.message} hint="Empty uses the workspace default.">
          <Input id="default-due" inputMode="numeric" {...form.register("defaultDueDays")} />
        </Field>
      </div>
      <Field label="Internal notes" htmlFor="client-notes" hint="Never printed on invoices.">
        <Textarea id="client-notes" rows={3} {...form.register("notes")} />
      </Field>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save client"}
      </Button>
    </form>
  )
}

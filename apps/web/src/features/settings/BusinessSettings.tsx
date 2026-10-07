import { workspaceUpdateSchema, CURRENCY_CODES, CURRENCIES, type WorkspaceUpdate } from "@workspace/shared"
import { listTemplates } from "@workspace/templates"
import { useForm, Controller } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field } from "@/components/form/Field"
import { payloadResolver, toNull } from "@/components/form/payloadResolver"
import { SelectField } from "@/components/form/SelectField"
import { applyServerErrors } from "@/components/form/useFormErrors"
import { useMe, useSaveWorkspace } from "@/lib/queries"

interface Values {
  name: string
  timezone: string
  defaultCurrency: WorkspaceUpdate["settings"]["defaultCurrency"]
  defaultPaperSize: WorkspaceUpdate["settings"]["defaultPaperSize"]
  defaultTemplateId: string
  defaultDueDays: string
  defaultPaymentTerms: string
  defaultNotes: string
}

const TIMEZONES = Intl.supportedValuesOf("timeZone")

function toPayload(values: Values, base: WorkspaceUpdate["settings"]): WorkspaceUpdate {
  return {
    name: values.name.trim(),
    timezone: values.timezone,
    settings: {
      ...base,
      defaultCurrency: values.defaultCurrency,
      defaultPaperSize: values.defaultPaperSize,
      defaultTemplateId: values.defaultTemplateId,
      defaultDueDays: Number(values.defaultDueDays),
      defaultPaymentTerms: toNull(values.defaultPaymentTerms),
      defaultNotes: toNull(values.defaultNotes),
    },
  }
}

export function BusinessSettings() {
  const me = useMe()
  const save = useSaveWorkspace()
  const workspace = me.data?.workspace
  const form = useForm<Values>({
    values: workspace && {
      name: workspace.name,
      timezone: workspace.timezone,
      defaultCurrency: workspace.settings.defaultCurrency,
      defaultPaperSize: workspace.settings.defaultPaperSize,
      defaultTemplateId: workspace.settings.defaultTemplateId,
      defaultDueDays: String(workspace.settings.defaultDueDays),
      defaultPaymentTerms: workspace.settings.defaultPaymentTerms ?? "",
      defaultNotes: workspace.settings.defaultNotes ?? "",
    },
    resolver: workspace && payloadResolver(workspaceUpdateSchema, (v: Values) => toPayload(v, workspace.settings), (path) => path.replace(/^settings./, "")),
  })
  if (!workspace) return null
  const errors = form.formState.errors
  const templates = [...new Map(listTemplates().map((t) => [t.id, t.name])).entries()].map(([value, label]) => ({ value, label }))

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(toPayload(values, workspace.settings))
      toast.success("Business settings saved")
    } catch (error) {
      applyServerErrors(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>Used for dates, defaults on new invoices and the workspace name.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" {...form.register("name")} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={errors.timezone?.message} hint="'Today' on invoices follows this timezone.">
            <Controller
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <SelectField id="timezone" value={field.value} onChange={field.onChange} options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))} />
              )}
            />
          </Field>
          <Field label="Default currency" htmlFor="currency">
            <Controller
              control={form.control}
              name="defaultCurrency"
              render={({ field }) => (
                <SelectField
                  id="currency"
                  value={field.value}
                  onChange={field.onChange}
                  options={CURRENCY_CODES.map((code) => ({ value: code, label: `${code} (${CURRENCIES[code].symbol})` }))}
                />
              )}
            />
          </Field>
          <Field label="Default paper size" htmlFor="paper">
            <Controller
              control={form.control}
              name="defaultPaperSize"
              render={({ field }) => (
                <SelectField id="paper" value={field.value} onChange={field.onChange} options={[{ value: "A4", label: "A4" }, { value: "LETTER", label: "Letter" }]} />
              )}
            />
          </Field>
          <Field label="Default template" htmlFor="template">
            <Controller
              control={form.control}
              name="defaultTemplateId"
              render={({ field }) => <SelectField id="template" value={field.value} onChange={field.onChange} options={templates} />}
            />
          </Field>
          <Field label="Default due days" htmlFor="dueDays" error={errors.defaultDueDays?.message}>
            <Input id="dueDays" inputMode="numeric" {...form.register("defaultDueDays")} />
          </Field>
          <Field label="Default payment terms" htmlFor="terms" className="sm:col-span-2">
            <Input id="terms" {...form.register("defaultPaymentTerms")} />
          </Field>
          <Field label="Default notes" htmlFor="notes" className="sm:col-span-2" hint="Printed on new invoices. Leave empty for none.">
            <Textarea id="notes" rows={3} {...form.register("defaultNotes")} />
          </Field>
        </CardContent>
      </Card>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  )
}

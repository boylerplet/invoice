import { useQuery } from "@tanstack/react-query"
import { numberingSettingsSchema, type NextNumberDto, type NumberingSettings as Numbering } from "@workspace/shared"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Field } from "@/components/form/Field"
import { payloadResolver } from "@/components/form/payloadResolver"
import { SelectField } from "@/components/form/SelectField"
import { applyServerErrors } from "@/components/form/useFormErrors"
import { api } from "@/lib/api"
import { useMe, useSaveWorkspace } from "@/lib/queries"

interface Values {
  prefix: string
  separator: Numbering["separator"]
  period: Numbering["period"]
  fyStartMonth: string
  padding: string
  startNumber: string
  resetEachPeriod: boolean
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const toNumbering = (v: Values): Numbering => ({
  prefix: v.prefix.trim(),
  separator: v.separator,
  period: v.period,
  fyStartMonth: Number(v.fyStartMonth),
  padding: Number(v.padding),
  startNumber: Number(v.startNumber),
  resetEachPeriod: v.resetEachPeriod,
})

export function NumberingSettings() {
  const me = useMe()
  const save = useSaveWorkspace()
  const workspace = me.data?.workspace
  const form = useForm<Values>({
    values: workspace && {
      ...workspace.settings.numbering,
      fyStartMonth: String(workspace.settings.numbering.fyStartMonth),
      padding: String(workspace.settings.numbering.padding),
      startNumber: String(workspace.settings.numbering.startNumber),
    },
    resolver: payloadResolver(numberingSettingsSchema, toNumbering),
  })
  const values = useWatch({ control: form.control })
  const candidate = numberingSettingsSchema.safeParse(toNumbering(values as Values))
  const preview = useQuery({
    queryKey: ["next-number", candidate.success ? candidate.data : null],
    enabled: candidate.success,
    queryFn: () => api.post<NextNumberDto>("/invoices/next-number-preview", { numbering: candidate.data }),
    placeholderData: (previous) => previous,
  })
  if (!workspace) return null
  const errors = form.formState.errors

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        name: workspace.name,
        timezone: workspace.timezone,
        settings: { ...workspace.settings, numbering: toNumbering(v) },
      })
      toast.success("Numbering saved")
    } catch (error) {
      applyServerErrors(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice numbering</CardTitle>
          <CardDescription>Numbers are never reused, even for discarded or cancelled invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Next number</p>
            <p className="text-2xl font-semibold tabular-nums" data-testid="number-preview">
              {preview.data?.number ?? "-"}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prefix" htmlFor="prefix" error={errors.prefix?.message}>
              <Input id="prefix" {...form.register("prefix")} />
            </Field>
            <Field label="Separator" htmlFor="separator">
              <Controller
                control={form.control}
                name="separator"
                render={({ field }) => (
                  <SelectField
                    id="separator"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "-", label: "Hyphen (-)" },
                      { value: "/", label: "Slash (/)" },
                      { value: "_", label: "Underscore (_)" },
                      { value: "", label: "None" },
                    ]}
                  />
                )}
              />
            </Field>
            <Field label="Period" htmlFor="period">
              <Controller
                control={form.control}
                name="period"
                render={({ field }) => (
                  <SelectField
                    id="period"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "calendar", label: "Calendar year (2026)" },
                      { value: "financial", label: "Financial year (26-27)" },
                      { value: "none", label: "None" },
                    ]}
                  />
                )}
              />
            </Field>
            {values.period === "financial" && (
              <Field label="Financial year starts in" htmlFor="fyStart">
                <Controller
                  control={form.control}
                  name="fyStartMonth"
                  render={({ field }) => (
                    <SelectField id="fyStart" value={field.value} onChange={field.onChange} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
                  )}
                />
              </Field>
            )}
            <Field label="Minimum digits" htmlFor="padding" error={errors.padding?.message} hint="Padding is a minimum width; longer numbers still print in full.">
              <Input id="padding" inputMode="numeric" {...form.register("padding")} />
            </Field>
            <Field label="Start number" htmlFor="start" error={errors.startNumber?.message}>
              <Input id="start" inputMode="numeric" {...form.register("startNumber")} />
            </Field>
          </div>
          {values.period !== "none" && (
            <label className="flex items-center gap-3 text-sm">
              <Controller
                control={form.control}
                name="resetEachPeriod"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
              Restart the counter each period
            </label>
          )}
        </CardContent>
      </Card>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save numbering"}
      </Button>
    </form>
  )
}

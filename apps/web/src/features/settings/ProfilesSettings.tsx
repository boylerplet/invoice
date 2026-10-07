import {
  Add01Icon,
  Archive02Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import {
  issuerProfileInputSchema,
  type IssuerProfileDto,
  type IssuerProfileInput,
} from "@workspace/shared"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Icon } from "@/components/Icon"
import { EditSheet } from "@/components/form/EditSheet"
import { Field } from "@/components/form/Field"
import {
  cleanLines,
  LabelValueEditor,
} from "@/components/form/LabelValueEditor"
import {
  linesToText,
  payloadResolver,
  textToLines,
  toNull,
} from "@/components/form/payloadResolver"
import { SelectField } from "@/components/form/SelectField"
import { applyServerErrors } from "@/components/form/useFormErrors"
import { EmptyState } from "@/components/PageHeader"
import {
  useAccounts,
  useArchiveProfile,
  useProfiles,
  useRemoveLogo,
  useSaveProfile,
  useUploadLogo,
} from "@/lib/queries"

interface Values {
  displayName: string
  legalName: string
  addressLines: string
  email: string
  phone: string
  website: string
  taxIds: IssuerProfileInput["taxIds"]
  defaultPaymentAccountId: string
  isDefault: boolean
}

const NO_ACCOUNT = "none"

const toPayload = (v: Values): IssuerProfileInput => ({
  displayName: v.displayName,
  legalName: toNull(v.legalName),
  addressLines: textToLines(v.addressLines),
  email: toNull(v.email),
  phone: toNull(v.phone),
  website: toNull(v.website),
  taxIds: cleanLines(v.taxIds),
  defaultPaymentAccountId:
    v.defaultPaymentAccountId === NO_ACCOUNT ? null : v.defaultPaymentAccountId,
  isDefault: v.isDefault,
})

const toValues = (p?: IssuerProfileDto): Values => ({
  displayName: p?.displayName ?? "",
  legalName: p?.legalName ?? "",
  addressLines: linesToText(p?.addressLines ?? []),
  email: p?.email ?? "",
  phone: p?.phone ?? "",
  website: p?.website ?? "",
  taxIds: p?.taxIds ?? [],
  defaultPaymentAccountId: p?.defaultPaymentAccountId ?? NO_ACCOUNT,
  isDefault: p?.isDefault ?? false,
})

function LogoControl({ profile }: { profile: IssuerProfileDto }) {
  const upload = useUploadLogo()
  const remove = useRemoveLogo()
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {profile.logoFile ? (
          <img
            src={`/uploads/${profile.logoFile}`}
            alt="Logo"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">No logo</span>
        )}
      </div>
      <div className="space-y-1">
        <label className="inline-flex">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            aria-label="Upload logo"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file)
                upload.mutate(
                  { id: profile.id, file },
                  {
                    onError: (err) => toast.error(err.message),
                    onSuccess: () => toast.success("Logo updated"),
                  }
                )
            }}
          />
          <span className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-input/30 px-3 text-sm hover:bg-input/50">
            {upload.isPending ? "Uploading..." : "Upload logo"}
          </span>
        </label>
        {profile.logoFile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove.mutate(profile.id)}
          >
            Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WebP or SVG, up to 2 MB.
        </p>
      </div>
    </div>
  )
}

function ProfileForm({
  profile,
  onSaved,
}: {
  profile?: IssuerProfileDto
  onSaved: (saved: IssuerProfileDto) => void
}) {
  const accounts = useAccounts()
  const save = useSaveProfile()
  const form = useForm<Values>({
    defaultValues: toValues(profile),
    resolver: payloadResolver(issuerProfileInputSchema, toPayload),
  })
  const errors = form.formState.errors
  const accountOptions = [
    { value: NO_ACCOUNT, label: "None" },
    ...(accounts.data ?? [])
      .filter((a) => !a.archivedAt)
      .map((a) => ({ value: a.id, label: a.label })),
  ]

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({
        id: profile?.id,
        input: toPayload(values),
      })
      toast.success(profile ? "Profile saved" : "Profile created")
      onSaved(saved)
    } catch (error) {
      applyServerErrors(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {profile ? (
        <LogoControl profile={profile} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Save the profile first, then add a logo.
        </p>
      )}
      <Field
        label="Display name"
        htmlFor="displayName"
        error={errors.displayName?.message}
        hint="Shown as the wordmark when there is no logo."
      >
        <Input id="displayName" {...form.register("displayName")} />
      </Field>
      <Field label="Legal name" htmlFor="legalName">
        <Input id="legalName" {...form.register("legalName")} />
      </Field>
      <Field label="Address" htmlFor="address" hint="One line per row.">
        <Textarea id="address" rows={3} {...form.register("addressLines")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" {...form.register("email")} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" {...form.register("phone")} />
        </Field>
      </div>
      <Field label="Website" htmlFor="website">
        <Input id="website" {...form.register("website")} />
      </Field>
      <Field
        label="Tax IDs"
        hint="Printed as plain information, for example GSTIN or PAN."
      >
        <Controller
          control={form.control}
          name="taxIds"
          render={({ field }) => (
            <LabelValueEditor
              value={field.value}
              onChange={field.onChange}
              labelPlaceholder="GSTIN"
              valuePlaceholder="29ABCDE1234F1Z5"
              addLabel="Add tax ID"
              max={6}
            />
          )}
        />
      </Field>
      <Field label="Default payment account" htmlFor="account">
        <Controller
          control={form.control}
          name="defaultPaymentAccountId"
          render={({ field }) => (
            <SelectField
              id="account"
              value={field.value}
              onChange={field.onChange}
              options={accountOptions}
            />
          )}
        />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        Use as the default profile for new invoices
      </label>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  )
}

export function ProfilesSettings() {
  const profiles = useProfiles()
  const archive = useArchiveProfile()
  const [editing, setEditing] = useState<IssuerProfileDto | "new" | null>(null)
  const list = profiles.data ?? []
  const current =
    typeof editing === "object" && editing
      ? (list.find((p) => p.id === editing.id) ?? editing)
      : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Issuer profiles</h2>
          <p className="text-sm text-muted-foreground">
            Who the invoice is from: for example you personally, and your
            company.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Icon icon={Add01Icon} /> Add profile
        </Button>
      </div>
      {list.length === 0 && !profiles.isPending && (
        <EmptyState
          title="No issuer profiles yet"
          hint="Add at least one profile before creating an invoice."
        />
      )}
      {list.map((p) => (
        <Card key={p.id} className={p.archivedAt ? "opacity-60" : undefined}>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
              {p.logoFile ? (
                <img
                  src={`/uploads/${p.logoFile}`}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{p.displayName}</p>
                {p.isDefault && <Badge variant="secondary">Default</Badge>}
                {p.archivedAt && <Badge variant="outline">Archived</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {[p.legalName, p.email].filter(Boolean).join(" · ") ||
                  "No details"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${p.displayName}`}
              onClick={() => setEditing(p)}
            >
              <Icon icon={PencilEdit02Icon} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={p.archivedAt ? "Restore profile" : "Archive profile"}
              onClick={() =>
                archive.mutate({ id: p.id, archived: Boolean(p.archivedAt) })
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
        title={editing === "new" ? "New issuer profile" : "Edit issuer profile"}
      >
        {editing !== null && (
          <ProfileForm
            key={current?.id ?? "new"}
            profile={current}
            onSaved={(saved) => setEditing(editing === "new" ? saved : null)}
          />
        )}
      </EditSheet>
    </div>
  )
}

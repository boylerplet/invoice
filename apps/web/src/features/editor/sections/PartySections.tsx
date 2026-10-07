import {
  clientSnapshot,
  issuerSnapshot,
  type ClientDto,
  type ClientSnapshot,
  type IssuerSnapshot,
} from "@workspace/shared"
import { useState } from "react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Icon } from "@/components/Icon"
import { EditSheet } from "@/components/form/EditSheet"
import { Field } from "@/components/form/Field"
import { LabelValueEditor } from "@/components/form/LabelValueEditor"
import { linesToText, textToLines } from "@/components/form/payloadResolver"
import { SelectField } from "@/components/form/SelectField"
import { ClientForm } from "@/features/clients/ClientForm"
import { useClients, useProfiles } from "@/lib/queries"
import type { SectionProps } from "./types"

const orNull = (value: string) => (value.trim() === "" ? null : value)

interface PartyFieldsProps<T extends IssuerSnapshot | ClientSnapshot> {
  value: T
  onChange: (next: T) => void
  disabled: boolean
  nameError?: string
  idPrefix: string
  nameLabel: string
}

function PartyFields<T extends IssuerSnapshot | ClientSnapshot>({
  value,
  onChange,
  disabled,
  nameError,
  idPrefix,
  nameLabel,
}: PartyFieldsProps<T>) {
  const set = (patch: Partial<IssuerSnapshot & ClientSnapshot>) =>
    onChange({ ...value, ...patch })
  const name = "displayName" in value ? value.displayName : value.name
  const legal = "legalName" in value ? value.legalName : value.contactPerson
  return (
    <div className="space-y-3">
      <Field label={nameLabel} htmlFor={`${idPrefix}-name`} error={nameError}>
        <Input
          id={`${idPrefix}-name`}
          disabled={disabled}
          value={name}
          onChange={(e) =>
            set(
              "displayName" in value
                ? { displayName: e.target.value }
                : { name: e.target.value }
            )
          }
        />
      </Field>
      <Field
        label={"legalName" in value ? "Legal name" : "Contact person"}
        htmlFor={`${idPrefix}-second`}
      >
        <Input
          id={`${idPrefix}-second`}
          disabled={disabled}
          value={legal ?? ""}
          onChange={(e) =>
            set(
              "legalName" in value
                ? { legalName: orNull(e.target.value) }
                : { contactPerson: orNull(e.target.value) }
            )
          }
        />
      </Field>
      <Field
        label="Address"
        htmlFor={`${idPrefix}-address`}
        hint="One line per row."
      >
        <Textarea
          id={`${idPrefix}-address`}
          rows={3}
          disabled={disabled}
          value={linesToText(value.addressLines)}
          onChange={(e) => set({ addressLines: e.target.value.split("\n") })}
          onBlur={(e) => set({ addressLines: textToLines(e.target.value) })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email" htmlFor={`${idPrefix}-email`}>
          <Input
            id={`${idPrefix}-email`}
            disabled={disabled}
            value={value.email ?? ""}
            onChange={(e) => set({ email: orNull(e.target.value) })}
          />
        </Field>
        <Field label="Phone" htmlFor={`${idPrefix}-phone`}>
          <Input
            id={`${idPrefix}-phone`}
            disabled={disabled}
            value={value.phone ?? ""}
            onChange={(e) => set({ phone: orNull(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="Tax IDs">
        <LabelValueEditor
          value={value.taxIds}
          onChange={(taxIds) => set({ taxIds })}
          addLabel="Add tax ID"
          labelPlaceholder="GSTIN"
          valuePlaceholder="Number"
          max={6}
        />
      </Field>
    </div>
  )
}

export function FromSection({ doc, update, error, disabled }: SectionProps) {
  const profiles = useProfiles()
  const options = (profiles.data ?? [])
    .filter((p) => !p.archivedAt || p.id === doc.issuer.profileId)
    .map((p) => ({ value: p.id, label: p.displayName }))
  const current = profiles.data?.find((p) => p.id === doc.issuer.profileId)
  const logo = doc.issuer.logoFile

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <Field label="Issuer profile" htmlFor="from-profile" className="flex-1">
          <SelectField
            id="from-profile"
            disabled={disabled}
            value={doc.issuer.profileId}
            options={options}
            onChange={(id) => {
              const profile = profiles.data?.find((p) => p.id === id)
              if (profile)
                update((d) => ({ ...d, issuer: issuerSnapshot(profile) }))
            }}
          />
        </Field>
        {current && !disabled && (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              update((d) => ({ ...d, issuer: issuerSnapshot(current) }))
            }
          >
            Refresh from profile
          </Button>
        )}
      </div>
      <div className="flex h-14 w-40 items-center justify-center overflow-hidden rounded border bg-muted">
        {logo ? (
          <img
            src={`/uploads/${logo}`}
            alt="Logo"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">No logo</span>
        )}
      </div>
      <PartyFields
        idPrefix="issuer"
        nameLabel="Display name"
        value={doc.issuer}
        disabled={disabled}
        nameError={error("issuer.displayName")}
        onChange={(issuer) => update((d) => ({ ...d, issuer }))}
      />
    </div>
  )
}

export function BillToSection({ doc, update, error, disabled }: SectionProps) {
  const clients = useClients()
  const [creating, setCreating] = useState(false)
  const options = (clients.data ?? [])
    .filter((c) => !c.archivedAt || c.id === doc.client.clientId)
    .map((c) => ({ value: c.id, label: c.name }))
  const current = clients.data?.find((c) => c.id === doc.client.clientId)
  const select = (client: ClientDto) =>
    update((d) => ({ ...d, client: clientSnapshot(client) }))

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <Field label="Client" htmlFor="bill-client" className="flex-1">
          <SelectField
            id="bill-client"
            disabled={disabled}
            value={doc.client.clientId}
            options={options}
            onChange={(id) => {
              const client = clients.data?.find((c) => c.id === id)
              if (client) select(client)
            }}
          />
        </Field>
        {!disabled && (
          <>
            {current && (
              <Button
                type="button"
                variant="outline"
                onClick={() => select(current)}
              >
                Refresh from client
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreating(true)}
            >
              <Icon icon={Add01Icon} /> New client
            </Button>
          </>
        )}
      </div>
      <PartyFields
        idPrefix="client"
        nameLabel="Client name"
        value={doc.client}
        disabled={disabled}
        nameError={error("client.name")}
        onChange={(client) => update((d) => ({ ...d, client }))}
      />
      <EditSheet open={creating} onOpenChange={setCreating} title="New client">
        {creating && (
          <ClientForm
            onSaved={(client) => {
              select(client)
              setCreating(false)
            }}
          />
        )}
      </EditSheet>
    </div>
  )
}

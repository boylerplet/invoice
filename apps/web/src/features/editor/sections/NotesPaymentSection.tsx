import {
  paymentSnapshot,
  suggestPaymentAccount,
  type ClientDto,
} from "@workspace/shared"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { useAccounts, useClients, useProfiles } from "@/lib/queries"
import type { SectionProps } from "./types"

const NOTES_MAX = 800

export function NotesSection({
  doc,
  update,
  error,
  supports,
  disabled,
}: SectionProps) {
  const enabled = doc.notes !== null
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-sm font-medium">
        <Switch
          checked={enabled}
          disabled={disabled || !supports.notes}
          onCheckedChange={(on) =>
            update((d) => ({ ...d, notes: on ? "" : null }))
          }
        />
        Print notes
      </label>
      {!supports.notes && (
        <p className="text-xs text-muted-foreground">
          This template does not print notes.
        </p>
      )}
      {enabled && (
        <Field
          label="Notes"
          htmlFor="doc-notes"
          error={error("notes")}
          hint={`${doc.notes?.length ?? 0} / ${NOTES_MAX}`}
        >
          <Textarea
            id="doc-notes"
            rows={4}
            maxLength={NOTES_MAX}
            disabled={disabled}
            value={doc.notes ?? ""}
            onChange={(e) => update((d) => ({ ...d, notes: e.target.value }))}
          />
        </Field>
      )}
    </div>
  )
}

export function PaymentSection({
  doc,
  update,
  supports,
  disabled,
}: SectionProps) {
  const accounts = useAccounts()
  const clients = useClients()
  const profiles = useProfiles()
  const client: ClientDto | undefined = clients.data?.find(
    (c) => c.id === doc.client.clientId
  )
  const profile = profiles.data?.find((p) => p.id === doc.issuer.profileId)
  const usable = (accounts.data ?? []).filter(
    (a) =>
      !a.archivedAt &&
      a.currency === doc.currency &&
      (a.issuerProfileId === null || a.issuerProfileId === doc.issuer.profileId)
  )

  function toggle(on: boolean) {
    if (!on) return update((d) => ({ ...d, payment: null }))
    const suggestion = suggestPaymentAccount(
      accounts.data ?? [],
      doc.currency,
      [client?.defaultPaymentAccountId, profile?.defaultPaymentAccountId],
      doc.issuer.profileId
    )
    update((d) => ({
      ...d,
      payment: suggestion
        ? paymentSnapshot(suggestion)
        : { accountId: "", title: "Payment details", lines: [] },
    }))
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-sm font-medium">
        <Switch
          checked={doc.payment !== null}
          disabled={disabled || !supports.paymentDetails}
          onCheckedChange={toggle}
        />
        Print payment details
      </label>
      {!supports.paymentDetails && (
        <p className="text-xs text-muted-foreground">
          This template does not print payment details.
        </p>
      )}
      {doc.payment && (
        <>
          <Field
            label="Payment account"
            htmlFor="doc-account"
            hint={
              usable.length === 0
                ? `No active ${doc.currency} accounts. Add one under Settings.`
                : undefined
            }
          >
            <SelectField
              id="doc-account"
              disabled={disabled}
              value={doc.payment.accountId || null}
              placeholder="Choose an account"
              options={usable.map((a) => ({ value: a.id, label: a.label }))}
              onChange={(id) => {
                const account = usable.find((a) => a.id === id)
                if (account)
                  update((d) => ({
                    ...d,
                    payment: paymentSnapshot(account, d.payment?.title),
                  }))
              }}
            />
          </Field>
          {doc.payment.lines.length > 0 && (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted/50 p-3 text-sm">
              {doc.payment.lines.map((line, i) => (
                <div key={i} className="contents">
                  <dt className="text-muted-foreground">{line.label}</dt>
                  <dd className="font-medium">{line.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  )
}

import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { EmptyState } from "@/components/PageHeader"
import { useCreateInvoice } from "@/lib/invoiceQueries"
import { useClients, useProfiles } from "@/lib/queries"

const AUTO = "auto"

/** Pick a client (and optionally a profile), then land in the editor with a numbered draft. */
export function NewInvoicePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const clients = useClients()
  const profiles = useProfiles()
  const create = useCreateInvoice()
  const [clientId, setClientId] = useState<string | null>(
    params.get("clientId")
  )
  const [profileId, setProfileId] = useState(AUTO)

  const activeClients = (clients.data ?? []).filter((c) => !c.archivedAt)
  const activeProfiles = (profiles.data ?? []).filter((p) => !p.archivedAt)

  if (
    clients.isSuccess &&
    profiles.isSuccess &&
    (activeClients.length === 0 || activeProfiles.length === 0)
  ) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <EmptyState
          title="Set up a client and an issuer profile first"
          hint="An invoice needs someone to bill and someone to bill from."
          action={
            <div className="flex gap-2">
              {activeProfiles.length === 0 && (
                <Button
                  render={<Link to="/settings/profiles" />}
                  nativeButton={false}
                >
                  Add issuer profile
                </Button>
              )}
              {activeClients.length === 0 && (
                <Button
                  variant="outline"
                  render={<Link to="/clients" />}
                  nativeButton={false}
                >
                  Add client
                </Button>
              )}
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>New invoice</CardTitle>
          <CardDescription>
            The client and profile fill in the details; you can still edit every
            field.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Client" htmlFor="new-client">
            <SelectField
              id="new-client"
              value={clientId}
              onChange={setClientId}
              placeholder="Choose a client"
              options={activeClients.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Field>
          <Field
            label="Invoice from"
            htmlFor="new-profile"
            hint="Automatic uses the client's default, then your default profile."
          >
            <SelectField
              id="new-profile"
              value={profileId}
              onChange={setProfileId}
              options={[
                { value: AUTO, label: "Automatic" },
                ...activeProfiles.map((p) => ({
                  value: p.id,
                  label: p.displayName,
                })),
              ]}
            />
          </Field>
          <Button
            disabled={!clientId || create.isPending}
            onClick={() =>
              clientId &&
              create.mutate(
                {
                  clientId,
                  issuerProfileId: profileId === AUTO ? undefined : profileId,
                },
                {
                  onSuccess: (invoice) =>
                    navigate(`/invoices/${invoice.id}`, { replace: true }),
                  onError: (e) => toast.error(e.message),
                }
              )
            }
          >
            {create.isPending ? "Creating..." : "Create draft"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

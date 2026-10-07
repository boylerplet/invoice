import type { FC } from "react"
import type { IntroProps } from "../../../../contract"

interface PartyProps {
  label: string
  name: string
  secondary: string | null
  addressLines: string[]
  email: string | null
  phone: string | null
  taxIds: { label: string; value: string }[]
}

const Party: FC<PartyProps> = ({ label, name, secondary, addressLines, email, phone, taxIds }) => (
  <div>
    <div className="label">{label}</div>
    <div className="party__name">{name}</div>
    {secondary && <div className="party__line party__muted">{secondary}</div>}
    {addressLines.length > 0 && (
      <div className="party__block">
        {addressLines.map((line, i) => (
          <div key={i} className="party__line">
            {line}
          </div>
        ))}
      </div>
    )}
    {(email || phone) && (
      <div className="party__block">
        {email && <div className="party__line">{email}</div>}
        {phone && <div className="party__line">{phone}</div>}
      </div>
    )}
    {taxIds.length > 0 && (
      <div className="party__block">
        {taxIds.map((tax, i) => (
          <div key={i} className="party__tax">
            <span className="party__tax-label">{tax.label}</span>
            <span>{tax.value}</span>
          </div>
        ))}
      </div>
    )}
  </div>
)

export const Intro: FC<IntroProps> = ({ vm }) => (
  <section className="intro">
    <Party
      label="From"
      name={vm.issuer.displayName}
      secondary={vm.issuer.legalName}
      addressLines={vm.issuer.addressLines}
      email={vm.issuer.email}
      phone={vm.issuer.phone}
      taxIds={vm.issuer.taxIds}
    />
    <Party
      label="Bill to"
      name={vm.client.name}
      secondary={vm.client.contactPerson}
      addressLines={vm.client.addressLines}
      email={vm.client.email}
      phone={vm.client.phone}
      taxIds={vm.client.taxIds}
    />
  </section>
)

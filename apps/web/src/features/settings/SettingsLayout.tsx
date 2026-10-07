import { NavLink, Navigate, useParams } from "react-router"
import { cn } from "@workspace/ui/lib/utils"
import { PageHeader } from "@/components/PageHeader"
import { AccountSettings } from "./AccountSettings"
import { BusinessSettings } from "./BusinessSettings"
import { DataSettings } from "./DataSettings"
import { NumberingSettings } from "./NumberingSettings"
import { PaymentAccountsSettings } from "./PaymentAccountsSettings"
import { ProfilesSettings } from "./ProfilesSettings"
import { TemplatesSettings } from "./TemplatesSettings"

const TABS = [
  { key: "business", label: "Business", Component: BusinessSettings },
  { key: "profiles", label: "Issuer profiles", Component: ProfilesSettings },
  {
    key: "payment-accounts",
    label: "Payment accounts",
    Component: PaymentAccountsSettings,
  },
  { key: "numbering", label: "Numbering", Component: NumberingSettings },
  { key: "templates", label: "Templates", Component: TemplatesSettings },
  { key: "account", label: "Account", Component: AccountSettings },
  { key: "data", label: "Data", Component: DataSettings },
] as const

export function SettingsLayout() {
  const { tab } = useParams()
  const current = TABS.find((t) => t.key === tab)
  if (!current) return <Navigate to="/settings/business" replace />
  const { Component } = current

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Everything needed to start invoicing."
      />
      <div className="flex flex-col gap-6 md:flex-row">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto md:w-48 md:flex-col"
        >
          {TABS.map((t) => (
            <NavLink
              key={t.key}
              to={`/settings/${t.key}`}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Component />
        </div>
      </div>
    </div>
  )
}

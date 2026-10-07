import { createBrowserRouter, Navigate } from "react-router"
import { PageHeader } from "@/components/PageHeader"
import { LoginPage } from "@/features/auth/LoginPage"
import { RequireAuth } from "@/features/auth/RequireAuth"
import { ClientsPage } from "@/features/clients/ClientsPage"
import { SettingsLayout } from "@/features/settings/SettingsLayout"
import { FixturePrint } from "@/features/templates/FixturePrint"
import { RegistryDump } from "@/features/templates/RegistryDump"
import { TemplateLab } from "@/features/templates/TemplateLab"

/** Screens built in later phases. */
const Later = ({ title }: { title: string }) => (
  <div className="p-6">
    <PageHeader title={title} description="Coming in a later build phase." />
  </div>
)

export const router = createBrowserRouter([
  ...(import.meta.env.DEV
    ? [
        { path: "/dev/templates/:id", element: <TemplateLab /> },
        { path: "/dev/registry", element: <RegistryDump /> },
        { path: "/print/fixture/:scenario", element: <FixturePrint /> },
      ]
    : []),
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: <Later title="Dashboard" /> },
      { path: "/invoices", element: <Later title="Invoices" /> },
      { path: "/clients", element: <ClientsPage /> },
      { path: "/clients/:id", element: <Later title="Client" /> },
      { path: "/activity", element: <Later title="Activity" /> },
      { path: "/settings", element: <Navigate to="/settings/business" replace /> },
      { path: "/settings/:tab", element: <SettingsLayout /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])

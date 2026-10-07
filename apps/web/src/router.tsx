import { createBrowserRouter, Navigate } from "react-router"
import { RouteError } from "@/components/RouteError"
import { LoginPage } from "@/features/auth/LoginPage"
import { RequireAuth } from "@/features/auth/RequireAuth"
import { EditorPage } from "@/features/editor/EditorPage"
import { HistoryPage } from "@/features/invoices/HistoryPage"
import { InvoicesPage } from "@/features/invoices/InvoicesPage"
import { NewInvoicePage } from "@/features/invoices/NewInvoicePage"
import { ActivityPage } from "@/features/activity/ActivityPage"
import { ClientPage } from "@/features/clients/ClientPage"
import { ClientsPage } from "@/features/clients/ClientsPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { PrintPage } from "@/features/print/PrintPage"
import { SettingsLayout } from "@/features/settings/SettingsLayout"
import { FixturePrint } from "@/features/templates/FixturePrint"
import { RegistryDump } from "@/features/templates/RegistryDump"
import { TemplateLab } from "@/features/templates/TemplateLab"

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      ...(import.meta.env.DEV
        ? [
            { path: "/dev/templates/:id", element: <TemplateLab /> },
            { path: "/dev/registry", element: <RegistryDump /> },
            { path: "/print/fixture/:scenario", element: <FixturePrint /> },
          ]
        : []),
      { path: "/login", element: <LoginPage /> },
      { path: "/print/:id", element: <PrintPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/invoices", element: <InvoicesPage /> },
          { path: "/invoices/new", element: <NewInvoicePage /> },
          { path: "/invoices/:id", element: <EditorPage /> },
          { path: "/invoices/:id/history", element: <HistoryPage /> },
          { path: "/clients", element: <ClientsPage /> },
          { path: "/clients/:id", element: <ClientPage /> },
          { path: "/activity", element: <ActivityPage /> },
          {
            path: "/settings",
            element: <Navigate to="/settings/business" replace />,
          },
          { path: "/settings/:tab", element: <SettingsLayout /> },
        ],
      },
      { path: "*", element: <RouteError /> },
    ],
  },
])

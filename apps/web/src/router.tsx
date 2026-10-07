import { createBrowserRouter } from "react-router"
import { FixturePrint } from "@/features/templates/FixturePrint"
import { RegistryDump } from "@/features/templates/RegistryDump"
import { TemplateLab } from "@/features/templates/TemplateLab"

export const router = createBrowserRouter([
  ...(import.meta.env.DEV
    ? [
        { path: "/dev/templates/:id", element: <TemplateLab /> },
        { path: "/dev/registry", element: <RegistryDump /> },
        { path: "/print/fixture/:scenario", element: <FixturePrint /> },
      ]
    : []),
  { path: "*", element: <p className="p-6">Invoice Studio</p> },
])

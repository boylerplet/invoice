import {
  Clock01Icon,
  DashboardSquare01Icon,
  Invoice01Icon,
  Logout01Icon,
  Settings01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import { useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Icon } from "@/components/Icon"
import { CommandPalette } from "./CommandPalette"
import { api } from "@/lib/api"

interface NavItem {
  to: string
  label: string
  icon: IconSvgElement
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: DashboardSquare01Icon },
  { to: "/invoices", label: "Invoices", icon: Invoice01Icon },
  { to: "/clients", label: "Clients", icon: UserMultipleIcon },
  { to: "/activity", label: "Activity", icon: Clock01Icon },
  { to: "/settings/business", label: "Settings", icon: Settings01Icon },
]

function isActive(path: string, item: NavItem): boolean {
  if (item.to === "/") return path === "/"
  const root = item.to.startsWith("/settings") ? "/settings" : item.to
  return path === root || path.startsWith(`${root}/`)
}

interface Props {
  workspaceName: string
  username: string
  children: ReactNode
}

export function AppShell({ workspaceName, username, children }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  async function logout() {
    await api.post("/auth/logout")
    queryClient.clear()
    navigate("/login", { replace: true })
  }

  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              IS
            </div>
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Invoice Studio
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={isActive(pathname, item)}
                      tooltip={item.label}
                      render={<Link to={item.to} />}
                    >
                      <Icon icon={item.icon} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
          <SidebarTrigger />
          <span className="truncate text-sm text-muted-foreground">
            {workspaceName}
          </span>
          <div className="flex-1" />
          <CommandPalette />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Account menu" />
              }
            >
              <Avatar className="size-7">
                <AvatarFallback className="text-xs uppercase">
                  {username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{username}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings/account")}>
                <Icon icon={Settings01Icon} /> Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <Icon icon={Logout01Icon} /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main id="main" className="min-h-0 flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

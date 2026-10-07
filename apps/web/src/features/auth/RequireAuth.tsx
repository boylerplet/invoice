import { Navigate, Outlet } from "react-router"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { AppShell } from "@/components/layout/AppShell"
import { useMe } from "@/lib/queries"

/** Everything except /login lives behind this guard. */
export function RequireAuth() {
  const me = useMe()
  if (me.isPending) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (me.isError) return <Navigate to="/login" replace />
  return (
    <AppShell workspaceName={me.data.workspace.name} username={me.data.user.username}>
      <Outlet />
    </AppShell>
  )
}

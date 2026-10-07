import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { Button } from "@workspace/ui/components/button"

/** Shown when a screen throws or a route does not exist, instead of a blank page. */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const message = notFound
    ? "This page does not exist."
    : error instanceof Error
      ? error.message
      : "Something went wrong."
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">
        {notFound ? "Page not found" : "Something went wrong"}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <Button render={<Link to="/" />} nativeButton={false}>
          Back to the dashboard
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </main>
  )
}

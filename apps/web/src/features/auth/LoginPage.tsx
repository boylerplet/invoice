import { useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { api, ApiError } from "@/lib/api"
import { keys, useMe } from "@/lib/queries"

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (me.data) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await api.post("/auth/login", {
        username: form.get("username"),
        password: form.get("password"),
      })
      await queryClient.invalidateQueries({ queryKey: keys.me })
      navigate("/", { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Invoice Studio</CardTitle>
          <CardDescription>Sign in to your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

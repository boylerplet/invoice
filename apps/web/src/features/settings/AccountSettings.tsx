import { changePasswordInputSchema } from "@workspace/shared"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Field } from "@/components/form/Field"
import { payloadResolver } from "@/components/form/payloadResolver"
import { applyServerErrors } from "@/components/form/useFormErrors"
import { api } from "@/lib/api"
import { useMe } from "@/lib/queries"

interface Values {
  currentPassword: string
  newPassword: string
  confirm: string
}

export function AccountSettings() {
  const me = useMe()
  const form = useForm<Values>({
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
    resolver: async (values, ctx, options) => {
      const base = await payloadResolver<Values, unknown>(
        changePasswordInputSchema,
        (v) => ({
          currentPassword: v.currentPassword,
          newPassword: v.newPassword,
        })
      )(values, ctx, options)
      if (values.newPassword !== values.confirm) {
        return {
          values: {},
          errors: {
            ...base.errors,
            confirm: { type: "validate", message: "Passwords do not match" },
          },
        }
      }
      return base
    },
  })
  const errors = form.formState.errors

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.post("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      toast.success("Password changed")
      form.reset()
    } catch (error) {
      applyServerErrors(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Signed in as {me.data?.user.username}. Everyone sharing this login
            shares one password.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-sm space-y-4">
          <Field
            label="Current password"
            htmlFor="current"
            error={errors.currentPassword?.message}
          >
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
            />
          </Field>
          <Field
            label="New password"
            htmlFor="new"
            error={errors.newPassword?.message}
            hint="At least 8 characters."
          >
            <Input
              id="new"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
          </Field>
          <Field
            label="Repeat new password"
            htmlFor="confirm"
            error={errors.confirm?.message}
          >
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...form.register("confirm")}
            />
          </Field>
        </CardContent>
      </Card>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Change password
      </Button>
    </form>
  )
}

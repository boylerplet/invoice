import { Download01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Icon } from "@/components/Icon"

export function DataSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>Everything lives on this computer or server. Export a copy whenever you like.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button render={<a href="/api/export/backup" download />} nativeButton={false}>
            <Icon icon={Download01Icon} /> Export all data (ZIP)
          </Button>
          <Button variant="outline" render={<a href="/api/export/backup?format=json" download />} nativeButton={false}>
            JSON only
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          The ZIP contains every client, invoice, revision and logo. The database file is <code>data/invoice.db</code> and logos are in <code>data/uploads</code>. Copying the
          <code> data </code> folder is also a complete backup.
        </p>
      </CardContent>
    </Card>
  )
}

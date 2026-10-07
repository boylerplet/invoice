import { listTemplates, templateThumbnail } from "@workspace/templates"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"

export function TemplatesSettings() {
  const templates = listTemplates()
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">Templates</h2>
        <p className="text-sm text-muted-foreground">
          Installed invoice designs. Choose one per invoice in the editor; set
          the default under Business.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((t) => {
          const thumb = templateThumbnail(t.id, t.version)
          const families = [
            ...new Set(t.fonts.map((f) => `${f.family} (${f.license})`)),
          ]
          return (
            <Card key={`${t.id}-${t.version}`} className="overflow-hidden pt-0">
              <div className="flex aspect-[210/297] max-h-72 items-start justify-center overflow-hidden border-b bg-muted">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={`${t.name} preview`}
                    className="w-full object-cover object-top"
                  />
                ) : (
                  <span className="m-auto text-sm text-muted-foreground">
                    No preview yet
                  </span>
                )}
              </div>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.name}</p>
                  <Badge variant="outline">v{t.version}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div className="flex flex-wrap gap-1">
                  {t.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Fonts: {families.join(", ")}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

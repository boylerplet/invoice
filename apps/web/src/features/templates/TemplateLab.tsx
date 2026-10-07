import {
  fixtures,
  listTemplates,
  type InvoiceLayout,
  type PaperSize,
} from "@workspace/templates"
import { InvoiceDocument } from "@workspace/templates"
import { Button } from "@workspace/ui/components/button"
import { useCallback, useState } from "react"
import { useParams } from "react-router"
import { useFixtureVm } from "./useFixtureVm"

const GUIDES_CSS = `
.lab-guides [data-page-body]{outline:1px dashed rgba(220,38,38,.6)}
.lab-guides [data-block]{outline:1px dotted rgba(37,99,235,.45)}
`

/** Dev-only: renders a template against every fixture with optional layout guides. */
export function TemplateLab() {
  const { id = "studio" } = useParams()
  const versions = listTemplates()
    .filter((t) => t.id === id)
    .map((t) => t.version)
  const [version, setVersion] = useState<number>(
    versions[versions.length - 1] ?? 1
  )
  const [paper, setPaper] = useState<PaperSize>("A4")
  const [guides, setGuides] = useState(false)
  const [scenario, setScenario] = useState(fixtures[0]?.id ?? "")
  const [layout, setLayout] = useState<InvoiceLayout | null>(null)
  const built = useFixtureVm(scenario, id, version, paper)
  const onLayout = useCallback((next: InvoiceLayout) => setLayout(next), [])

  return (
    <div className="flex h-svh">
      <style>{GUIDES_CSS}</style>
      <aside className="w-72 shrink-0 space-y-4 overflow-y-auto border-r p-4 text-sm">
        <h1 className="text-base font-semibold">Template lab: {id}</h1>
        <div className="flex flex-wrap gap-2">
          {versions.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={v === version ? "default" : "outline"}
              onClick={() => setVersion(v)}
            >
              v{v}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["A4", "LETTER"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === paper ? "default" : "outline"}
              onClick={() => setPaper(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant={guides ? "default" : "outline"}
          onClick={() => setGuides((g) => !g)}
        >
          Show page boxes
        </Button>
        <p className="text-muted-foreground">
          {layout?.status ?? "measuring"} · {layout?.snapshot?.plan.length ?? 0}{" "}
          page(s)
          {layout?.error ? ` · ${layout.error}` : ""}
        </p>
        <ul className="space-y-1">
          {fixtures.map((f) => (
            <li key={f.id}>
              <button
                className={`w-full rounded px-2 py-1 text-left ${f.id === scenario ? "bg-accent font-medium" : "hover:bg-accent/50"}`}
                onClick={() => setScenario(f.id)}
              >
                {f.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main
        className={`flex-1 overflow-auto bg-neutral-200 p-6 ${guides ? "lab-guides" : ""}`}
      >
        {built && (
          <InvoiceDocument
            vm={built.vm}
            template={built.template}
            paperSize={paper}
            gap={16}
            onLayout={onLayout}
          />
        )}
      </main>
    </div>
  )
}

import { InvoiceDocument, type PaperSize, PAPER_MM } from "@workspace/templates"
import { useParams, useSearchParams } from "react-router"
import { useFixtureVm } from "./useFixtureVm"

/** Dev-only, unauthenticated page used by `pnpm template:shots` and the conformance tests. */
export function FixturePrint() {
  const { scenario = "" } = useParams()
  const [params] = useSearchParams()
  const paper: PaperSize = params.get("paper") === "LETTER" ? "LETTER" : "A4"
  const version = params.get("version")
    ? Number(params.get("version"))
    : undefined
  const built = useFixtureVm(
    scenario,
    params.get("template") ?? "studio",
    version,
    paper
  )
  if (!built) return <p>Unknown fixture or template</p>
  const { w, h } = PAPER_MM[paper]
  return (
    <>
      <style>{`@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;background:#fff}`}</style>
      <InvoiceDocument
        vm={built.vm}
        template={built.template}
        paperSize={paper}
      />
    </>
  )
}

import {
  createVm,
  FIXTURE_LOGO_URL,
  getFixture,
  requireTemplate,
  type PaperSize,
  type TemplateModule,
} from "@workspace/templates"
import { useMemo } from "react"

export function useFixtureVm(
  scenario: string,
  templateId: string,
  version: number | undefined,
  paper: PaperSize
) {
  return useMemo(() => {
    const fixture = getFixture(scenario)
    if (!fixture) return null
    const template: TemplateModule = requireTemplate(templateId, version)
    const doc = {
      ...fixture.doc,
      presentation: { ...fixture.doc.presentation, paperSize: paper },
    }
    return {
      template,
      vm: createVm(doc, template.manifest, { logoUrl: FIXTURE_LOGO_URL }),
    }
  }, [scenario, templateId, version, paper])
}

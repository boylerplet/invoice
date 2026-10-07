import type { TemplateManifest, TemplateModule } from "./contract"
import studioV1 from "./templates/studio/v1"

/** Add a template: create its folder under src/templates and list the module here. */
const MODULES: TemplateModule[] = [studioV1]

export function listTemplates(): TemplateManifest[] {
  return MODULES.map((m) => m.manifest)
}

export function latestVersion(id: string): number | null {
  const versions = MODULES.filter((m) => m.manifest.id === id).map((m) => m.manifest.version)
  return versions.length === 0 ? null : Math.max(...versions)
}

/** Without `version`, resolves the latest released version. */
export function getTemplate(id: string, version?: number): TemplateModule | null {
  const wanted = version ?? latestVersion(id)
  return MODULES.find((m) => m.manifest.id === id && m.manifest.version === wanted) ?? null
}

export function requireTemplate(id: string, version?: number): TemplateModule {
  const found = getTemplate(id, version)
  if (!found) throw new Error(`Unknown template ${id}${version ? ` v${version}` : ""}`)
  return found
}

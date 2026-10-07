import { listTemplates } from "@workspace/templates"

/** Dev-only: exposes the registered manifests to the conformance tests. */
export function RegistryDump() {
  return <pre id="registry">{JSON.stringify(listTemplates())}</pre>
}

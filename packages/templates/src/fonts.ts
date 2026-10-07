import type { FontFaceDef, TemplateManifest } from "./contract"
import { templateKey } from "./contract"

const FONT_URLS = import.meta.glob("../fonts/**/*.woff2", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>

const SAMPLE = "Aā₹–·•"
const loaded = new Map<string, Promise<void>>()

function urlFor(file: string): string {
  const url = FONT_URLS[`../fonts/${file}`]
  if (!url) throw new Error(`Font file not bundled: fonts/${file}`)
  return url
}

const weightRange = (w: FontFaceDef["weight"]) => (Array.isArray(w) ? `${w[0]} ${w[1]}` : String(w))

export function fontFaceCss(fonts: FontFaceDef[]): string {
  return fonts
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${weightRange(f.weight)};` +
        `font-display:block;src:url("${urlFor(f.file)}") format("woff2");` +
        (f.unicodeRange ? `unicode-range:${f.unicodeRange};` : "") +
        "}"
    )
    .join("\n")
}

function inject(manifest: TemplateManifest): void {
  const id = `${templateKey(manifest)}-fonts`
  if (document.getElementById(id)) return
  const style = document.createElement("style")
  style.id = id
  style.textContent = fontFaceCss(manifest.fonts)
  document.head.appendChild(style)
}

/**
 * Injects the template's @font-face rules and resolves once every face is loaded.
 * Layout must never run before this resolves.
 */
export function loadTemplateFonts(manifest: TemplateManifest): Promise<void> {
  const key = templateKey(manifest)
  const existing = loaded.get(key)
  if (existing) return existing
  const promise = (async () => {
    inject(manifest)
    await Promise.all(
      manifest.fonts.map((f) => {
        const weight = Array.isArray(f.weight) ? f.weight[0] : f.weight
        return document.fonts.load(`${f.style} ${weight} 1em "${f.family}"`, SAMPLE)
      })
    )
    await document.fonts.ready
  })()
  loaded.set(key, promise)
  promise.catch(() => loaded.delete(key))
  return promise
}

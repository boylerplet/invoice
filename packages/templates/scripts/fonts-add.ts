/**
 * pnpm fonts:add --family "Inter" --source fontsource [--weights 400,500,600,700] [--subsets latin,latin-ext]
 * pnpm fonts:add --family "Name" --source file --zip <path> --license <id> --url <source-url>
 *
 * Copies open-source font files into packages/templates/fonts/<family>/, records the
 * licence in fonts/LICENSES.md and prints the FontFaceDef[] snippet for a manifest.
 */
import { execFileSync } from "node:child_process"
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { unzipSync } from "fflate"

const FONTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../fonts")
const LICENSES = join(FONTS_DIR, "LICENSES.md")
const OPEN = new Set(["OFL-1.1", "Apache-2.0"])

interface FaceSnippet {
  family: string
  weight: number | [number, number]
  style: "normal" | "italic"
  file: string
  unicodeRange?: string
  license: string
  source: string
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg?.startsWith("--")) out[arg.slice(2)] = argv[i + 1] ?? ""
  }
  return out
}

const slug = (family: string) => family.toLowerCase().replace(/[^a-z0-9]+/g, "-")

function record(family: string, license: string, source: string): void {
  if (!OPEN.has(license)) console.warn(`WARNING: licence "${license}" is not OFL-1.1 or Apache-2.0. Check it permits embedding.`)
  mkdirSync(FONTS_DIR, { recursive: true })
  if (!existsSync(LICENSES)) writeFileSync(LICENSES, "# Font licences\n\n| Family | Licence | Source |\n|---|---|---|\n")
  if (!readFileSync(LICENSES, "utf8").includes(`| ${family} |`)) {
    appendFileSync(LICENSES, `| ${family} | ${license} | ${source} |\n`)
  }
}

function fromFontsource(family: string, weights: number[], subsets: string[]): FaceSnippet[] {
  const tmp = mkdtempSync(join(tmpdir(), "fontsource-"))
  const base = slug(family)
  let pkg = `@fontsource-variable/${base}`
  let variable = true
  const pack = (name: string) =>
    execFileSync("npm", ["pack", name, "--pack-destination", tmp, "--silent"], { encoding: "utf8", shell: true }).trim().split(/\r?\n/).pop() ?? ""
  let tarball: string
  try {
    tarball = pack(pkg)
  } catch {
    pkg = `@fontsource/${base}`
    variable = false
    tarball = pack(pkg)
  }
  execFileSync("tar", ["-xzf", tarball], { cwd: tmp })
  const root = join(tmp, "package")
  const meta = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { license?: string }
  const license = meta.license ?? "Other"
  const outDir = join(FONTS_DIR, base)
  mkdirSync(outDir, { recursive: true })
  const source = `https://fontsource.org/fonts/${base}`
  const faces: FaceSnippet[] = []
  const cssFiles = variable ? ["index.css"] : weights.map((w) => `${w}.css`)

  for (const cssName of cssFiles) {
    const css = readFileSync(join(root, cssName), "utf8")
    for (const block of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
      const url = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block)?.[1]
      if (!url) continue
      const subset = subsets.find((s) => url.includes(`-${s}-`))
      if (!subset) continue
      const style = /font-style:\s*(\w+)/.exec(block)?.[1] === "italic" ? "italic" : "normal"
      if (variable && style === "italic") continue
      const weightText = /font-weight:\s*([\d\s]+)/.exec(block)?.[1]?.trim() ?? "400"
      const [lo, hi] = weightText.split(/\s+/).map(Number)
      copyFileSync(join(root, "files", url), join(outDir, url))
      faces.push({
        family,
        weight: hi && lo !== hi ? [lo ?? 400, hi] : (lo ?? 400),
        style,
        file: `${base}/${url}`,
        unicodeRange: /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim(),
        license,
        source,
      })
    }
  }
  for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
    if (existsSync(join(root, name))) copyFileSync(join(root, name), join(outDir, "LICENSE.txt"))
  }
  record(family, license, source)
  return faces
}

const WEIGHT_WORDS: [RegExp, number][] = [
  [/thin/i, 100], [/extralight|ultralight/i, 200], [/light/i, 300], [/medium/i, 500],
  [/semibold|demibold/i, 600], [/extrabold|ultrabold/i, 800], [/black|heavy/i, 900], [/bold/i, 700],
]

function fromZip(family: string, zipPath: string, license: string, url: string): FaceSnippet[] {
  const files = unzipSync(new Uint8Array(readFileSync(zipPath)))
  const base = slug(family)
  const outDir = join(FONTS_DIR, base)
  mkdirSync(outDir, { recursive: true })
  const faces: FaceSnippet[] = []
  for (const [path, data] of Object.entries(files)) {
    const ext = extname(path).toLowerCase()
    if (![".woff2", ".woff", ".ttf"].includes(ext)) continue
    const name = basename(path)
    writeFileSync(join(outDir, name), data)
    const weight = WEIGHT_WORDS.find(([re]) => re.test(name))?.[1] ?? 400
    faces.push({ family, weight, style: /italic/i.test(name) ? "italic" : "normal", file: `${base}/${name}`, license, source: url })
  }
  record(family, license, url)
  return faces
}

const args = parseArgs(process.argv.slice(2))
const family = args.family
if (!family || !args.source) {
  console.error('Usage: pnpm fonts:add --family "Inter" --source fontsource [--weights 400,500] [--subsets latin,latin-ext]')
  process.exit(1)
}
const faces =
  args.source === "file"
    ? fromZip(family, args.zip ?? "", args.license ?? "Other", args.url ?? "")
    : fromFontsource(
        family,
        (args.weights ?? "400,500,600,700").split(",").map(Number),
        (args.subsets ?? "latin,latin-ext").split(",")
      )
console.log(`Added ${faces.length} font file(s) to ${join(FONTS_DIR, slug(family))}`)
console.log("Paste into your manifest `fonts`:\n")
console.log(JSON.stringify(faces, null, 2))
console.log(`\nFiles: ${readdirSync(join(FONTS_DIR, slug(family))).join(", ")}`)

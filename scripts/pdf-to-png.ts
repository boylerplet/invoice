/**
 * pnpm tsx scripts/pdf-to-png.ts <file.pdf> [scale]
 * Renders every page of a PDF to <file>-p<N>.png for visual review.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { createCanvas } from "@napi-rs/canvas"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

const file = process.argv[2]
if (!file) throw new Error("Usage: pdf-to-png.ts <file.pdf> [scale]")
const scale = Number(process.argv[3] ?? 1.5)
const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i)
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D, viewport }).promise
  const out = file.replace(/\.pdf$/i, `-p${i}.png`)
  writeFileSync(out, canvas.toBuffer("image/png"))
  console.log(`saved ${out}`)
}

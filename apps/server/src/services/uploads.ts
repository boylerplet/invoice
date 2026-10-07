import { randomUUID } from "node:crypto"
import { existsSync, readdirSync, unlinkSync, writeFileSync } from "node:fs"
import { join, basename } from "node:path"
import { ApiError } from "../http/errors"

export const MAX_LOGO_BYTES = 2 * 1024 * 1024

type LogoKind = "png" | "jpg" | "webp" | "svg"

const UNSAFE_SVG = [
  /<script/i,
  /\son[a-z]+\s*=/i,
  /javascript:/i,
  /<foreignObject/i,
  /<iframe/i,
  /<!ENTITY/i,
  /(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/|data:text)/i,
]

/** Detect the real file type from magic bytes; the client-declared type is ignored. */
export function detectLogoKind(bytes: Uint8Array): LogoKind | null {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return "png"
  if (startsWith(0xff, 0xd8, 0xff)) return "jpg"
  const isRiff = startsWith(0x52, 0x49, 0x46, 0x46)
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  if (isRiff && isWebp) return "webp"
  const head = new TextDecoder().decode(bytes.slice(0, 512)).trimStart()
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg"
  return null
}

export function saveLogo(uploadsDir: string, bytes: Uint8Array): string {
  if (bytes.byteLength > MAX_LOGO_BYTES) throw new ApiError(413, "TOO_LARGE", "Logo must be 2 MB or smaller")
  const kind = detectLogoKind(bytes)
  if (!kind) throw new ApiError(415, "BAD_FILE", "Logo must be a PNG, JPG, WebP or SVG image")
  if (kind === "svg") {
    const text = new TextDecoder().decode(bytes)
    if (UNSAFE_SVG.some((re) => re.test(text))) {
      throw new ApiError(415, "UNSAFE_SVG", "This SVG contains scripts or external references")
    }
  }
  const file = `${randomUUID()}.${kind}`
  writeFileSync(join(uploadsDir, file), bytes)
  return file
}

export function deleteUpload(uploadsDir: string, file: string | null): void {
  if (!file) return
  const path = join(uploadsDir, basename(file))
  if (existsSync(path)) unlinkSync(path)
}

export const listUploads = (uploadsDir: string): string[] => readdirSync(uploadsDir)

export interface NumberingSettings {
  prefix: string
  separator: "-" | "/" | "_" | ""
  period: "calendar" | "financial" | "none"
  fyStartMonth: number
  padding: number
  startNumber: number
  resetEachPeriod: boolean
}

export const DEFAULT_NUMBERING: NumberingSettings = {
  prefix: "INV",
  separator: "-",
  period: "calendar",
  fyStartMonth: 4,
  padding: 4,
  startNumber: 1,
  resetEachPeriod: true,
}

export const MANUAL_NUMBER_RE = /^[A-Za-z0-9/_-]{1,32}$/

function yearMonth(iso: string): { year: number; month: number } {
  const [y, m] = iso.split("-").map(Number)
  return { year: y ?? 1970, month: m ?? 1 }
}

function financialStartYear(settings: NumberingSettings, iso: string): number {
  const { year, month } = yearMonth(iso)
  return month >= settings.fyStartMonth ? year : year - 1
}

/** Text of the period inside the number: "2026", "26-27" or "". */
export function periodLabel(settings: NumberingSettings, iso: string): string {
  if (settings.period === "none") return ""
  if (settings.period === "calendar") return String(yearMonth(iso).year)
  const start = financialStartYear(settings, iso)
  const yy = (n: number) => String(n % 100).padStart(2, "0")
  return `${yy(start)}-${yy(start + 1)}`
}

/** Key of the counter sequence this date belongs to. */
export function periodKey(settings: NumberingSettings, iso: string): string {
  if (settings.period === "none" || !settings.resetEachPeriod) return "all"
  return settings.period === "calendar"
    ? String(yearMonth(iso).year)
    : String(financialStartYear(settings, iso))
}

export function formatNumber(
  settings: NumberingSettings,
  iso: string,
  counter: number
): string {
  const padded = String(counter).padStart(Math.max(settings.padding, 1), "0")
  return [settings.prefix, periodLabel(settings, iso), padded]
    .filter((p) => p !== "")
    .join(settings.separator)
}

export function previewNextNumber(
  settings: NumberingSettings,
  iso: string,
  lastValue = 0
): string {
  return formatNumber(settings, iso, Math.max(lastValue + 1, settings.startNumber))
}

export interface Allocation {
  number: string
  counter: number
  periodKey: string
}

/** Next free number; skips anything already taken (including deleted/cancelled). */
export function allocateNumber(
  settings: NumberingSettings,
  iso: string,
  lastValue: number,
  isTaken: (number: string) => boolean
): Allocation {
  let counter = Math.max(lastValue + 1, settings.startNumber)
  let number = formatNumber(settings, iso, counter)
  while (isTaken(number)) {
    counter += 1
    number = formatNumber(settings, iso, counter)
  }
  return { number, counter, periodKey: periodKey(settings, iso) }
}

export function isValidManualNumber(value: string): boolean {
  return MANUAL_NUMBER_RE.test(value)
}

/** Counter inside `number` if it follows the current pattern for this date, else null. */
export function parseCounter(
  settings: NumberingSettings,
  iso: string,
  number: string
): number | null {
  const sample = formatNumber(settings, iso, 0)
  const width = Math.max(settings.padding, 1)
  const head = sample.slice(0, sample.length - width)
  if (!number.startsWith(head)) return null
  const tail = number.slice(head.length)
  return /^\d+$/.test(tail) ? Number(tail) : null
}

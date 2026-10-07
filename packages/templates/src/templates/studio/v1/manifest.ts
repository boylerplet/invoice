import type { FontFaceDef, TemplateManifest } from "../../../contract"

const INTER_SOURCE = "https://fontsource.org/fonts/inter"

const inter = (file: string, unicodeRange: string): FontFaceDef => ({
  family: "Inter",
  weight: [100, 900],
  style: "normal",
  file,
  unicodeRange,
  license: "OFL-1.1",
  source: INTER_SOURCE,
})

const margins = { top: 16, right: 16, bottom: 14, left: 16 }

export const manifest: TemplateManifest = {
  id: "studio",
  version: 1,
  name: "Studio",
  description:
    "Restrained and typographic. Inter, hairline rules, a tinted meta strip and one blue accent.",
  tags: ["minimal", "typographic", "modern"],
  paper: { A4: { margins }, LETTER: { margins } },
  fonts: [
    inter(
      "inter/inter-latin-ext-wght-normal.woff2",
      "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
    ),
    inter(
      "inter/inter-latin-wght-normal.woff2",
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
    ),
  ],
  tokens: {
    "--ink": "#111111",
    "--text": "#2B2B2B",
    "--muted": "#6B6B6B",
    "--hairline": "#D9D9D9",
    "--tint": "#F3F3F1",
    "--accent": "#1F3DFF",
  },
  columns: [
    {
      key: "description",
      label: "Description",
      width: "minmax(0, 1fr)",
      align: "left",
      hideWhenEmpty: false,
    },
    {
      key: "qty",
      label: "Qty",
      width: "24mm",
      align: "right",
      hideWhenEmpty: true,
    },
    {
      key: "rate",
      label: "Rate",
      width: "30mm",
      align: "right",
      hideWhenEmpty: true,
    },
    {
      key: "amount",
      label: "Amount",
      width: "34mm",
      align: "right",
      hideWhenEmpty: false,
    },
  ],
  supports: {
    dueDate: true,
    reference: true,
    paymentTerms: true,
    notes: true,
    paymentDetails: true,
    tax: true,
    adjustments: true,
    logo: true,
  },
  options: {
    terminalAnchor: "bottom",
    moneyDecimals: "always",
    groupContinuationLabel: true,
    keepLastRowsWithTerminal: 2,
  },
}

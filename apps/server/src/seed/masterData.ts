import type {
  ClientInput,
  IssuerProfileInput,
  PaymentAccountInput,
} from "@workspace/shared"

/** Fictional studio data. Every name, number and ID below is invented. */

export const WORKSPACE_NAME = "Menon Design Studio"

export const PROFILES: Record<"personal" | "company", IssuerProfileInput> = {
  personal: {
    displayName: "Aarav Menon",
    legalName: null,
    addressLines: [
      "Flat 4B, Lakeview Residency",
      "Indiranagar, Bengaluru 560038",
    ],
    email: "aarav@menon.example",
    phone: "+91 98450 11111",
    website: "aaravmenon.example",
    taxIds: [{ label: "PAN", value: "SAMPL1234F" }],
    defaultPaymentAccountId: null,
    isDefault: false,
  },
  company: {
    displayName: "Menon Design Co.",
    legalName: "Menon Design Company LLP",
    addressLines: [
      "14, 3rd Cross, 12th Main",
      "Indiranagar, Bengaluru 560038, Karnataka",
    ],
    email: "hello@menondesign.example",
    phone: "+91 98450 22222",
    website: "menondesign.example",
    taxIds: [{ label: "GSTIN", value: "29SAMPL1234F1Z5" }],
    defaultPaymentAccountId: null,
    isDefault: true,
  },
}

export const ACCOUNTS: Record<
  "personal" | "company" | "usd",
  Omit<PaymentAccountInput, "issuerProfileId">
> = {
  personal: {
    label: "HDFC savings - Aarav Menon",
    currency: "INR",
    kind: "bank",
    lines: [
      { label: "A/C holder", value: "Aarav Menon" },
      { label: "A/C number", value: "0000 1234 5678 90" },
      { label: "IFSC", value: "SAMP0000001" },
      { label: "Bank", value: "Sample Bank, Indiranagar" },
      { label: "UPI", value: "aarav@samplebank" },
    ],
  },
  company: {
    label: "Current account - Menon Design Co.",
    currency: "INR",
    kind: "bank",
    lines: [
      { label: "A/C holder", value: "Menon Design Co." },
      { label: "A/C number", value: "0000 9876 5432 10" },
      { label: "IFSC", value: "SAMP0000002" },
      { label: "Bank", value: "Sample Bank, MG Road" },
    ],
  },
  usd: {
    label: "USD receiving account - Menon Design Co.",
    currency: "USD",
    kind: "bank",
    lines: [
      { label: "Beneficiary", value: "Menon Design Co." },
      { label: "Account number", value: "0000 5555 1234" },
      { label: "SWIFT / BIC", value: "SAMPUS33XXX" },
      { label: "Bank", value: "Sample International Bank, New York" },
    ],
  },
}

export interface ClientSeed {
  key: "kaveri" | "tarang" | "orbit" | "nilgiri" | "vantage" | "holloway"
  input: Omit<ClientInput, "defaultIssuerProfileId" | "defaultPaymentAccountId">
  profile: "personal" | "company"
  account: "personal" | "company" | "usd"
}

const base = {
  notes: null,
  defaultCurrency: null,
  defaultDueDays: null,
} as const

export const CLIENTS: ClientSeed[] = [
  {
    key: "kaveri",
    profile: "company",
    account: "company",
    input: {
      ...base,
      name: "Kaveri Automation Pvt Ltd",
      contactPerson: "Ananya Rao",
      addressLines: [
        "Plot 22, Peenya Industrial Area",
        "Bengaluru 560058, Karnataka",
      ],
      email: "accounts@kaveri.example",
      phone: "+91 80 4000 1000",
      taxIds: [{ label: "GSTIN", value: "29SAMPL5678M1Z2" }],
    },
  },
  {
    key: "tarang",
    profile: "company",
    account: "company",
    input: {
      ...base,
      name: "Tarang Industrial Controls",
      contactPerson: "Rohit Deshpande",
      addressLines: ["Gat No. 114, Chakan MIDC", "Pune 410501, Maharashtra"],
      email: "finance@tarang.example",
      phone: "+91 20 6600 2000",
      taxIds: [{ label: "GSTIN", value: "27SAMPL9012K1Z8" }],
    },
  },
  {
    key: "orbit",
    profile: "personal",
    account: "personal",
    input: {
      ...base,
      name: "Orbit Machine Works",
      contactPerson: "Meena Krishnan",
      addressLines: ["SF 41, Avinashi Road", "Coimbatore 641014, Tamil Nadu"],
      email: "meena@orbit.example",
      phone: "+91 422 400 3000",
      taxIds: [],
    },
  },
  {
    key: "nilgiri",
    profile: "personal",
    account: "personal",
    input: {
      ...base,
      name: "Nilgiri Tea Machinery",
      contactPerson: "Suresh Bhat",
      addressLines: ["12, Mount Road", "Coonoor 643101, Tamil Nadu"],
      email: "suresh@nilgiritea.example",
      phone: null,
      taxIds: [],
    },
  },
  {
    key: "vantage",
    profile: "company",
    account: "company",
    input: {
      ...base,
      name: "Vantage Sensors Pvt Ltd",
      contactPerson: "Farah Syed",
      addressLines: ["Plot 8, Hitec City", "Hyderabad 500081, Telangana"],
      email: "ap@vantage.example",
      phone: "+91 40 7100 4000",
      taxIds: [{ label: "GSTIN", value: "36SAMPL3456P1Z4" }],
    },
  },
  {
    key: "holloway",
    profile: "company",
    account: "usd",
    input: {
      ...base,
      name: "Holloway Robotics Inc.",
      contactPerson: "Dana Holloway",
      addressLines: ["1200 Congress Ave, Suite 400", "Austin, TX 78701, USA"],
      email: "ap@holloway.example",
      phone: null,
      taxIds: [{ label: "EIN", value: "00-0000000" }],
      defaultCurrency: "USD",
      defaultDueDays: 30,
    },
  },
]

/** Two invented logo marks, written as SVG files. */
export const LOGOS = {
  personal:
    '<svg xmlns="http://www.w3.org/2000/svg" width="168" height="56" viewBox="0 0 168 56"><circle cx="28" cy="28" r="28" fill="#1F3DFF"/><path d="M16 40 28 14l12 26M20.5 32h15" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="68" y="35" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#111">Aarav Menon</text></svg>',
  company:
    '<svg xmlns="http://www.w3.org/2000/svg" width="168" height="56" viewBox="0 0 168 56"><rect width="56" height="56" rx="12" fill="#111111"/><path d="M14 40V16l14 16 14-16v24" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><text x="68" y="35" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#111">Menon</text></svg>',
} as const

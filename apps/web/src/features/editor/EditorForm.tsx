import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion"
import { AdjustmentsSection } from "./sections/AdjustmentsSection"
import { DocumentSection } from "./sections/DocumentSection"
import { ItemsSection } from "./sections/ItemsSection"
import { NotesSection, PaymentSection } from "./sections/NotesPaymentSection"
import { BillToSection, FromSection } from "./sections/PartySections"
import type { SectionProps } from "./sections/types"

interface EditorFormProps extends SectionProps {
  invoiceId: string
}

const SECTIONS = ["document", "from", "bill-to", "items", "adjustments", "notes", "payment"]

/** The left panel: every part of the invoice, as accordion sections over one shared draft. */
export function EditorForm(props: EditorFormProps) {
  return (
    <Accordion multiple defaultValue={["document", "items"]} className="rounded-none border-0">
      {SECTIONS.map((key) => (
        <AccordionItem key={key} value={key}>
          <AccordionTrigger className="px-4">{TITLES[key]}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <fieldset disabled={props.disabled} className="min-w-0 border-0 p-0">
              {key === "document" && <DocumentSection {...props} />}
              {key === "from" && <FromSection {...props} />}
              {key === "bill-to" && <BillToSection {...props} />}
              {key === "items" && <ItemsSection {...props} />}
              {key === "adjustments" && <AdjustmentsSection {...props} />}
              {key === "notes" && <NotesSection {...props} />}
              {key === "payment" && <PaymentSection {...props} />}
            </fieldset>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

const TITLES: Record<string, string> = {
  document: "Document",
  from: "From",
  "bill-to": "Bill to",
  items: "Items",
  adjustments: "Adjustments and tax",
  notes: "Notes",
  payment: "Payment details",
}

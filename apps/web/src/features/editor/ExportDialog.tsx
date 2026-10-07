import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  onChoose: (issue: boolean) => void
}

/** Shown when exporting a draft: issue it as part of the export, or just download a copy. */
export function ExportDialog({ open, onOpenChange, busy, onChoose }: ExportDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export PDF</AlertDialogTitle>
          <AlertDialogDescription>
            This invoice is still a draft. Issue it now, or download a copy and keep editing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="outline" disabled={busy} onClick={() => onChoose(false)}>
            Download without issuing
          </Button>
          <Button disabled={busy} onClick={() => onChoose(true)}>
            Export &amp; mark as issued
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

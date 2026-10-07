import { todayIn, type InvoiceDetailDto } from "@workspace/shared"
import { useCallback, useEffect, useState } from "react"
import { useBlocker, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@workspace/ui/components/resizable"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Field } from "@/components/form/Field"
import { EmptyState } from "@/components/PageHeader"
import { CancelDialog, PayDialog, SimpleActionDialog } from "@/features/invoices/InvoiceDialogs"
import { shortDate } from "@/lib/format"
import { useInvoice, useInvoiceAction } from "@/lib/invoiceQueries"
import { useMe } from "@/lib/queries"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { EditorForm } from "./EditorForm"
import { EditorHeader, type HeaderAction } from "./EditorHeader"
import { selectDirty, useEditorStore } from "./editorStore"
import { PreviewPanel } from "./PreviewPanel"
import { useDocIssues } from "./useDocIssues"
import { useInvoiceSaver } from "./useInvoiceSaver"
import { useInvoiceVm } from "./useInvoiceVm"

const LAYOUT_KEY = "invoice-studio.editor.layout"

function readLayout(): Record<string, number> | undefined {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : undefined
  } catch {
    return undefined
  }
}

function saveLayout(layout: Record<string, number>): void {
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
  } catch {
    // Storage can be unavailable (private windows); the layout simply is not remembered.
  }
}

function Banner({ detail, onRestore }: { detail: InvoiceDetailDto; onRestore: () => void }) {
  if (detail.deletedAt) {
    return (
      <div className="bg-amber-500/10 flex items-center justify-between gap-3 border-b px-4 py-2 text-sm">
        <span>This draft is in the Trash and read-only.</span>
        <Button size="sm" variant="outline" onClick={onRestore}>Restore</Button>
      </div>
    )
  }
  if (detail.status === "PAID") {
    return <div className="bg-emerald-500/10 border-b px-4 py-2 text-sm">Paid on {shortDate(detail.paidAt)}{detail.paidNote ? ` (${detail.paidNote})` : ""}. This invoice is read-only: reopen it to make changes.</div>
  }
  if (detail.status === "CANCELLED") {
    return <div className="bg-muted border-b px-4 py-2 text-sm">Cancelled{detail.cancelReason ? `: ${detail.cancelReason}` : ""}. This invoice is read-only: duplicate it to start a new draft.</div>
  }
  return null
}

export function EditorPage() {
  const { id = "" } = useParams()
  const query = useInvoice(id)
  const navigate = useNavigate()
  const desktop = useMediaQuery("(min-width: 1024px)")
  const doc = useEditorStore((s) => s.doc)
  const loadedId = useEditorStore((s) => s.invoiceId)
  const dirty = useEditorStore(selectDirty)
  const saveState = useEditorStore((s) => s.saveState)
  const savedAt = useEditorStore((s) => s.savedAt)
  const showErrors = useEditorStore((s) => s.showErrors)
  const update = useEditorStore((s) => s.update)
  const detail = query.data
  const status = detail?.status ?? "DRAFT"
  const readOnly = !detail || status === "PAID" || status === "CANCELLED" || detail.deletedAt !== null
  const saver = useInvoiceSaver(id, status === "DRAFT" && !readOnly)
  const preview = useInvoiceVm(doc, status)
  const issues = useDocIssues(doc)
  const run = useInvoiceAction()
  const me = useMe()
  const today = todayIn(me.data?.workspace.timezone ?? "Asia/Kolkata")

  const [dialog, setDialog] = useState<HeaderAction | "save" | null>(null)
  const [changeNote, setChangeNote] = useState("")

  // Load the server document into the editor once per invoice.
  useEffect(() => {
    if (detail && loadedId !== detail.id) useEditorStore.getState().load(detail.id, detail.doc)
  }, [detail, loadedId])
  useEffect(() => () => useEditorStore.getState().reset(), [])

  const reload = useCallback((next: InvoiceDetailDto) => useEditorStore.getState().load(next.id, next.doc), [])

  // Leaving with unsaved edits: drafts save first, issued invoices ask.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== "blocked" || status !== "DRAFT") return
    void saver.flush().then((ok) => (ok ? blocker.proceed() : blocker.reset()))
  }, [blocker, status, saver])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const requestSave = useCallback(() => {
    if (status === "ISSUED") {
      if (!useEditorStore.getState().doc) return
      setChangeNote("")
      setDialog("save")
    } else if (status === "DRAFT") {
      void saver.flush()
    }
  }, [status, saver])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        requestSave()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [requestSave])

  if (query.isError) return <div className="p-6"><EmptyState title="Invoice not found" hint="It may belong to another workspace or no longer exist." /></div>
  if (!detail || !doc || !preview || loadedId !== detail.id) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const errorFor = (path: string) => (showErrors || status !== "DRAFT" ? issues.byPath[path] : undefined)

  async function onAction(action: HeaderAction) {
    if (!detail) return
    if (action === "issue") {
      if (!(await saver.flush())) return
      if (!issues.valid) {
        useEditorStore.getState().setShowErrors(true)
        toast.error(issues.general[0] ?? "Fix the highlighted fields before issuing")
        return
      }
    }
    if (action === "duplicate") {
      if (status === "DRAFT") await saver.flush()
      run.mutate({ id: detail.id, action: "duplicate" }, { onSuccess: (copy) => { toast.success(`Created draft ${copy.number}`); navigate(`/invoices/${copy.id}`) }, onError: (e) => toast.error(e.message) })
      return
    }
    setDialog(action)
  }

  const target = { id: detail.id, number: detail.number }
  const close = () => setDialog(null)
  const form = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <EditorForm invoiceId={detail.id} doc={doc} update={update} error={errorFor} supports={preview.template.manifest.supports} disabled={readOnly} />
    </div>
  )
  const previewPane = <PreviewPanel vm={preview.vm} template={preview.template} paper={doc.presentation.paperSize} />

  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col">
      <EditorHeader detail={detail} number={doc.number} dirty={dirty} saveState={saveState} savedAt={savedAt} onSave={requestSave} onRetry={() => void saver.flush()} onAction={onAction} />
      <Banner detail={detail} onRestore={() => run.mutate({ id: detail.id, action: "restore" }, { onSuccess: reload })} />
      {issues.general.length > 0 && <div role="alert" className="bg-destructive/10 text-destructive border-b px-4 py-2 text-sm">{issues.general[0]}</div>}
      {desktop ? (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1" defaultLayout={readLayout()} onLayoutChanged={saveLayout}>
          <ResizablePanel id="form" defaultSize="42%" minSize="28%" collapsible collapsedSize="0%" className="flex flex-col">
            {form}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="preview" defaultSize="58%" minSize="30%">
            {previewPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <Tabs defaultValue="edit" className="min-h-0 flex-1 gap-0">
          <TabsList className="mx-3 mt-2 w-fit">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="flex min-h-0 flex-col">{form}</TabsContent>
          <TabsContent value="preview" className="min-h-0">{previewPane}</TabsContent>
        </Tabs>
      )}

      <SimpleActionDialog action={dialog === "issue" || dialog === "reopen" || dialog === "discard" ? dialog : null} target={dialog ? target : null} onClose={close} onDone={(next) => { if (dialog === "discard") navigate("/invoices"); else reload(next) }} />
      <PayDialog target={dialog === "pay" ? target : null} today={today} onClose={close} onDone={reload} />
      <CancelDialog target={dialog === "cancel" ? target : null} onClose={close} onDone={reload} />
      <ConfirmDialog
        open={dialog === "save"}
        onOpenChange={(open) => !open && close()}
        title="Save changes"
        description="This creates a new revision of the issued invoice. Add a note so you can find it in the history."
        confirmLabel="Save revision"
        busy={saver.saving}
        onConfirm={async () => {
          if (await saver.flush(changeNote.trim() || null)) {
            toast.success("Revision saved")
            close()
          }
        }}
      >
        <Field label="What changed? (optional)" htmlFor="change-note">
          <Input id="change-note" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={blocker.state === "blocked" && status !== "DRAFT"}
        onOpenChange={(open) => !open && blocker.state === "blocked" && blocker.reset()}
        title="Leave without saving?"
        description="Your unsaved changes to this issued invoice will be lost."
        confirmLabel="Leave"
        destructive
        onConfirm={() => blocker.state === "blocked" && blocker.proceed()}
      />
    </div>
  )
}

# Next steps (not built)

Everything in `docs/POSSIBLE_ADDITIONS.md` is deliberately deferred (GST mode, quotes and credit notes, partial payments, per-line tax, email, recurring invoices, reports and CSV, more currencies, multi-workspace, user templates, client portal, attachments, reminders, CSV import).

Candidate polish items noticed while building:

- More templates (use `TEMPLATE_DESIGN_PROMPT.md`, which the user will supply) and thumbnails via `pnpm template:shots <id> --thumb`.
- Code-split the web bundle (single chunk of about 1.1 MB).
- Dark-mode review of the status badges and the preview toolbar.
- Editor: undo/redo, per-section validity badges.
- A restore-from-backup command (today restore means copying the `data/` folder back).

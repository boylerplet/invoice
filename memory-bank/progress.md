# Progress

Update this file at the end of every work chunk. Newest status first.

## Current phase
Phase 2 — Server foundation (next)

## Phase checklist
- [x] 0 Scaffold
- [x] 1 Shared domain
- [ ] 2 Server foundation
- [ ] 3 Template system
- [ ] 4 Web shell and master data
- [ ] 5 Editor
- [ ] 6 Lists, dashboard, activity
- [ ] 7 PDF
- [ ] 8 Seed, polish, docs

## Log
- Toolchain verified: Node 24, pnpm 12.9.1, git. shadcn monorepo scaffolded (see docs/DECISIONS.md).
- Phase 1 done: `packages/shared` has money/format/dates/schema/calculate/vm/numbering/lifecycle with 52 tests. InvoiceVM types live in shared (`vm.ts`) because templates depends on shared; templates' contract re-exports them. Row rate/amount strings have no currency symbol; only `vm.total` has it.

# JNS Systems — Phase 1 Audit Task Board

This board records the onboarding audit and evidence-based follow-up work. Phase 2 implementation is gated on human review and approval.

## Status definitions

- **Review:** Audit or deliverable is prepared and awaiting human review.
- **Proposed:** Candidate follow-up; not approved or assigned.
- **In progress:** An approved task has an owner actively working on it.
- **Blocked:** Progress requires an explicitly recorded decision or dependency.
- **Done:** The owner has accepted the deliverable and applicable verification is complete.

## Phase 1

| ID | Task | Status | Scope | Evidence / blocker |
|---|---|---|---|---|
| P1-AUDIT-001 | Establish repository onboarding baseline | Review | Verify architecture, structure, versions, package manager, scripts, integrations, deployment files, and existing checks; update the root architecture report, task board, and handoff record | Audit docs updated 2026-11-18 against `main` at `aeab836`. Installed dependency versions were inspected on the source checkout; exact baseline versions are pinned in `main`'s lockfile. `npm run check:env` on the source checkout reported five required and four recommended names missing. Tests/build/lint were not rerun; prior 2026-11-14 results are labeled historical in `docs/ARCHITECTURE.md`. Ready for owner review; do not mark Done until accepted. |

## Proposed Phase 2 work

These are recommendations, not approved implementation tasks. Confirm scope, owner, branch, and acceptance criteria before moving any item to **In progress**.

| ID | Candidate task | Priority | Status | Dependency / decision needed |
|---|---|---|---|---|
| P2-001 | Inventory Supabase schema, migrations, and RLS policies | High | Proposed | Owner identifies authoritative Supabase project/schema and approves read-only inspection |
| P2-002 | Map and test authorization across routes, Server Actions, and service-role access | High | Proposed | Agree canonical role rules; security-sensitive changes require owner approval |
| P2-003 | Confirm provider/deployment environment setup and secret-encryption policy | High | Proposed | Owner verifies Vercel, Supabase, Google, Resend, Twilio, Arketa, Lemon Squeezy, and key management |
| P2-004 | Establish pull-request CI checks and address the lint baseline | High | Proposed | Agree lint remediation/baseline and confirm required-check names before branch protection |
| P2-005 | Add focused integration and multi-tenant tests | Medium | Proposed | Follow the schema and authorization inventories |
| P2-006 | Clarify module/component ownership and remove stale or duplicate code if approved | Medium | Proposed | Owner decides whether the backup page, unused session helper, and duplicate UI primitives are retained |
| P2-007 | Replace generic setup sections in the root README with verified project guidance | Medium | Proposed | Confirm environment provisioning and database setup steps |
| P2-008 | Resolve unmatched task-reminders schedule and verify Gmail Pub/Sub retry/authentication contract | High | Proposed | Confirm intended endpoint and subscription configuration with the owner before changing integration behavior |

## Coordination notes

- This is a documentation-only branch based on `main`; no application source or dependency files are included in this contribution.
- Do not begin Phase 2 work until the owner reviews this audit and approves specific tasks.
- The audit-only branch is `docs/phase1-onboarding-audit`, based on `main` at `aeab836`; it has not been pushed or deployed.
- The separate `fix/playbooks-upload-view-actions` branch and its mixed commit `a7f2a31` remain untouched. Do not use that branch for an audit-only push.

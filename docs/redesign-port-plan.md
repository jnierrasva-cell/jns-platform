# JNSystem redesign — port plan (VS Code AI branch → current main)

Generated against:
- `main` @ latest (includes Journey kanban, mobile tabs, Schedule cards, build fixes)
- `redesign/jnsystem-visual-navigation` (9 ahead / **73 behind** — do **not** merge as-is)

## Rule

Rebase is painful (73 commits). **Preferred:** new branch from `main`, cherry-pick or manually re-apply **SAFE** visual files only. Re-implement IA changes only if product explicitly wants them.

---

## SAFE — visual / presentational (candidates to port onto main)

| File | Notes |
|------|--------|
| `docs/redesign-feature-inventory.md` | Docs only — safe |
| `components/ui/badge.tsx` | New primitive |
| `components/ui/card.tsx` | New primitive |
| `components/ui/dialog.tsx` | New primitive |
| `components/ui/input.tsx` | New primitive |
| `components/ui/select.tsx` | New primitive |
| `components/ui/sheet.tsx` | New primitive |
| `components/ui/sidebar.tsx` | New primitive |
| `components/ui/switch.tsx` | New primitive |
| `components/ui/tabs.tsx` | New primitive |
| `components/ui/textarea.tsx` | New primitive |
| `components/ui/toast.tsx` | New primitive — needs `ToastProvider` in layout if used |
| `components/ui/bottom-tab-bar.tsx` | Only if shell is refactored to use it; main already has inline tabs |
| `components/ui/button.tsx` | Diff carefully — keep existing button API consumers working |
| `components/setup-progress-ring.tsx` | Presentational |
| `components/today-schedule.tsx` | Presentational helper for Today |
| `components/empty-state.tsx` | Small style tweaks |
| `components/first-run-panel.tsx` | Style only — verify handlers still wired |
| `components/breaker-switch.tsx` | Style only — verify toggle still calls same action |
| `components/forms-client.tsx` | Restyle — **BEFORE/AFTER** handlers |
| `components/sops-client.tsx` | Restyle — **BEFORE/AFTER** handlers |
| `components/contact-detail-client.tsx` | Restyle — **BEFORE/AFTER** handlers |
| `components/bookings-client.tsx` | Prefer **main** version (has mobile cards); take only desktop class polish from VS AI if needed |
| `components/contacts-client.tsx` | Prefer **main** + optional VS AI desktop polish; do not drop handlers |
| `components/pipeline-client.tsx` | Prefer **main** kanban behavior; merge VS AI styles carefully |
| `components/support-bubble.tsx` | Prefer **main** (`bottom-20` mobile offset) |
| `app/globals.css` | Tokens/fonts — test light theme; VS AI may force `dark` on `<html>` |
| `app/layout.tsx` | Fonts (Bricolage + DM Sans) OK; **remove forced `dark` class** if shipping light UI; ToastProvider OK if toast used |

## RISKY — do not copy blindly

| File | Why |
|------|-----|
| `components/dashboard-shell.tsx` | Rebuilds IA: Autopilot route, fewer setup links, different mobile tabs, `/support` link |
| `app/dashboard/page.tsx` (Today) | Large rewrite — keep data fetching; restyle only |
| `app/dashboard/autopilot/page.tsx` | **New route** + consolidates 4 areas — product decision |
| `components/autopilot-tabs.tsx` | Only with autopilot page |
| `app/dashboard/automation/page.tsx` | Becomes **redirect only** — removes standalone page body |
| `app/dashboard/email-rules/page.tsx` | Redirect to autopilot tab |
| `app/dashboard/templates/page.tsx` | Redirect to autopilot tab |
| `app/dashboard/unmatched/page.tsx` | Redirect to autopilot tab |
| `app/dashboard/automation/actions.ts` | Adds `revalidatePath("/dashboard/autopilot")` — OK only if autopilot ships |
| `app/dashboard/email-rules/actions.ts` | Same |
| `app/dashboard/templates/actions.ts` | Same |
| `app/dashboard/unmatched/actions.ts` | Same |
| `lib/org/roles.ts` | Adds `/dashboard/autopilot` to manager prefixes |
| `proxy.ts` | Adds `/dashboard/autopilot` to manager middleware |
| `app/dashboard/pipeline/page.tsx` | Both fetch contacts; **main** select fields are richer (`source`, `updated_at`) — keep main |

## Product decisions required before porting RISKY items

1. **Autopilot hub** at `/dashboard/autopilot` with tabs (automation / rules / templates / unmatched)?
   - Yes → port page + tabs + redirects + revalidatePath + roles/proxy together.
   - No → skip all of those; keep separate sidebar entries (current main).
2. **Mobile tab bar IA** — keep main (Today/Clients/Journey/Schedule/More) or VS AI (Autopilot replaces Journey for managers)?
3. **Forced `dark` on `<html>`** — conflicts with light command-center goal → **do not port** as-is.

## Recommended port order (browser-first)

1. Inventory doc + UI primitives (no dark force)
2. layout fonts **without** `dark` class; globals light tokens
3. Today page visual polish on **main’s data**
4. Desktop polish: Clients, Journey, Schedule (preserve main logic)
5. Forms, Playbooks, contact detail, first-run, empty states
6. Autopilot consolidation **only after** explicit “go”

## Do not merge

```
main...redesign/jnsystem-visual-navigation
```

as a single PR. It will fight 73 commits and can wipe mobile/kanban/build fixes.

## Definition of done for a clean port branch

- [ ] Branched from current `main`
- [ ] No placeholder component bodies
- [ ] All handlers/actions/gates still present (BEFORE/AFTER per file)
- [ ] Nav still complete for browser users unless Autopilot hub approved
- [ ] Light theme (no accidental site-wide dark)
- [ ] `next build` clean

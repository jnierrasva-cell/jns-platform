# JNS Redesign Feature Inventory

## Audit Status

- Branch: `redesign/jnsystem-visual-navigation`, created from clean `main`.
- Scope: route pages, their server/client components and actions, shared dashboard shell, auth/org/plan gates, billing, and integration handlers.
- `[x]` means the current source behavior was inspected. `[ ]` means the Step 4 runtime regression check has not been performed.
- No application code, styles, routes, data flow, or permissions were changed during this audit. This document is the only planned Step 0 file change.
- This is a source audit, not a live workflow test. Real Supabase, Google, Twilio, Arketa, Lemon Squeezy, and Resend credentials/accounts are not available in this workspace; integration behavior remains unverified at runtime.

## Roles, Plan Gates, and Shared Shell

### Plan matrix in `lib/billing/plans.ts`

| Effective plan | Seat limit | Invites | Custom forms flag | Email automation | Email rules | SMS reminders |
| --- | ---: | --- | --- | --- | --- | --- |
| No plan | 1 | Locked | Locked by definition | Locked | Locked | Locked |
| Starter | 2 | Allowed | Allowed | Locked | Locked | Locked |
| Pro | 10 | Allowed | Allowed | Allowed | Allowed | Allowed |
| Business | 25 | Allowed | Allowed | Allowed | Allowed | Allowed |

An effective paid plan requires an active/trialing billing status and a valid, unexpired period end (or no period end). `assertCanInvite`, `assertEmailRules`, `assertEmailAutomation`, and `assertSmsReminders` enforce their respective capabilities on server actions. `customForms` is defined in plan limits and displayed in Billing, but no form action currently calls a custom-form assertion; form creation/update is available to any org member. Record this as existing behavior and do not silently change it during a visual redesign. The manual `Send due SMS reminders` action checks that reminders are enabled and Twilio is connected, but does not call `assertSmsReminders` itself.

### Roles and access checks

- Workspace roles in data: `ceo` (visible label Owner), `admin`, `assistant`, and `member`. The invite UI can assign Admin, Assistant, or Member; the CEO/Owner role is not assignable in that form.
- `isOrgManagerRole` means `ceo` or `admin`. Workspace branding, automation, templates, team, and integrations are manager-only in navigation/middleware or their server actions. Twilio connect/disconnect and test SMS are more restrictive: CEO/Owner only. Google and Arketa management allow CEO/Owner or Admin.
- `proxy.ts` protects dashboard, admin, and onboarding routes, enforces platform-admin paths, and blocks manager-only paths for non-managers. The active workspace is resolved from the `jns_active_org` cookie, profile active organization, and the user's memberships. Workspace switching updates both the profile and cookie.
- Platform admin is authorized by `profiles.role === "super_admin"` with an email-based fallback. `/admin` and `/dashboard/admin` render the same JNS Admin client. `/dashboard/admin` is additionally inside the dashboard layout and therefore expects the dashboard membership/onboarding path; `/admin` is the separate platform-admin route.

### Shared navigation and feedback

- Owner: `components/dashboard-shell.tsx`. Existing desktop navigation is a collapsible sidebar. Mobile navigation is a slide-out sidebar, not a bottom tab bar. Work links are Overview, Contacts, Pipeline, Bookings, Forms, and SOPs. Manager links add Workspace, Unmatched email, Automation, Email rules, Templates, Integrations, and Team. Account links include My workspaces, Billing for managers, JNS Admin for platform admins, Privacy, and Sign out.
- A floating `components/support-bubble.tsx` is mounted by the dashboard shell. It submits feedback through `app/dashboard/support/actions.ts` to Resend, includes the signed-in email, active workspace, and current path, and has inline validation/error/success states.
- `components/empty-state.tsx`, `components/page-loading.tsx`, `app/dashboard/loading.tsx`, and `app/dashboard/error.tsx` provide reusable empty/loading/error patterns. Most form errors and successes are inline; no shared toast provider was found. Some flows use browser `alert()`/`confirm()`.
- Existing visual system: `app/globals.css` defines light and `.dark` tokens, but the root layout and most dashboard views are styled light with hard-coded navy accents. Root font is Inter. `components/ui` contains a Base UI Button and a small set of primitives; most application components still use local Tailwind classes. No visual changes are included in this phase.

## Dashboard Pages

### Today / Overview

- `[x]` Route `/dashboard`; route file `app/dashboard/page.tsx`; page component is server-rendered, shared shell is `components/dashboard-shell.tsx`, first-run checklist is `components/first-run-panel.tsx`.
- Data: active org and effective plan; Google/Twilio/Arketa connections; team count; enabled automation count; contacts, pipeline stages, next-30-day bookings, unmatched email count, enabled rules, templates, and seven-day email activity count.
- Existing UI/actions: live KPI links, manager-only first-run checklist, suggested next action, pipeline stage/status summary, recent contacts, and upcoming bookings. Setup checklist links to Integrations, Automation, Email rules, Templates and uses live data. There is no greeting, setup progress ring, inquiry-flow strip, or recent-activity feed today; the page has live metrics and activity count only. Any new flow strip must use real counts or be explicitly labeled sample data.
- Gates: authenticated user with active workspace; dashboard layout enforces membership/onboarding. Setup card is shown to CEO/Owner and Admin. No page-specific plan lock.
- Runtime verification: `[ ]` Owner/no-plan, paid plan, Member; responsive viewports; links and live counts.

### Clients / Contacts

- `[x]` Route `/dashboard/contacts`; `app/dashboard/contacts/page.tsx`; `components/contacts-client.tsx`.
- Data: contacts and pipeline stages from the active workspace, plus Google and Twilio connection indicators.
- Existing actions: search by name/email/phone; filter by stage; add contact with first/last name, email or phone, legacy status, optional note; update pipeline stage; send email or SMS from row actions; CSV import (up to 500 rows, creates/updates/skips with validation); CSV export. `app/dashboard/contacts/actions.ts` owns server mutations; CSV export is client-side. Detail links open `/dashboard/contacts/[id]`.
- Gates: authenticated org member; no page-specific plan gate. Server actions require org membership. Email/SMS depend on the workspace's Google/Twilio connections.
- Runtime verification: `[ ]` search, filters, add, import/export, stage assignment, email/SMS, responsive table/modal.

### Client Detail

- `[x]` Route `/dashboard/contacts/[id]`; `app/dashboard/contacts/[id]/page.tsx`; `components/contact-detail-client.tsx`.
- Data: workspace-scoped contact, pipeline stages, up to 50 email activity records, up to 20 bookings, and up to 50 notes.
- Existing actions: edit contact names/email/phone/legacy status/stage; add internal notes; inspect bookings and email activity; navigate back to Contacts. Email/SMS sending is exposed on the Contacts list, not in this detail component.
- Gates: authenticated org member; no page-specific plan gate.
- Runtime verification: `[ ]` save validation, note creation, cross-workspace contact isolation, empty/history states.

### Journey / Pipeline

- `[x]` Route `/dashboard/pipeline`; `app/dashboard/pipeline/page.tsx`; `components/pipeline-client.tsx`.
- Data: ordered workspace pipeline stages.
- Existing actions: add, rename, and delete stages; deletion is blocked while contacts use the stage. Contact-stage assignment is available from Contacts and Contact Detail.
- Gates: authenticated org member; no plan gate.
- Confirmed correction: there is no drag/reorder control or reorder server action. The `position` field determines display order, and new stages append. Do not invent a working reorder behavior without a model/action or an explicit TODO/sample label.
- Runtime verification: `[ ]` add/rename/delete, in-use validation, contact stage updates.

### Schedule / Bookings

- `[x]` Route `/dashboard/bookings`; `app/dashboard/bookings/page.tsx`; `components/bookings-client.tsx`.
- Data: workspace slug, bookings and linked contacts, contact options, SMS reminder toggle state, Twilio connection state.
- Existing actions: create manual booking with title, start/end local times, optional contact, notes, optional Google Calendar attendee invitation; mark scheduled bookings completed/cancelled; manually send due SMS reminders. Shows booking status and reminder-sent time. Public link is `/book/<orgSlug>`.
- Gates: authenticated org member. SMS automation toggle requires Pro/Business and Twilio; manual reminder action checks automation enabled and Twilio connected, but has no direct plan assertion. Calendar synchronization is attempted when a Google connection is available.
- Runtime verification: `[ ]` create/status/calendar invite, public link, SMS due-window behavior and errors.

### Intake Forms

- `[x]` Route `/dashboard/forms`; `app/dashboard/forms/page.tsx`; `components/forms-client.tsx`; form schema in `lib/forms/fields.ts`.
- Data: workspace slug/name, forms, publish state, field definitions, and submission counts. Default field types are text, email, phone, and textarea.
- Existing actions: create/publish form; edit name, headline, description, success message and fields; add/remove/customize questions; duplicate; copy public link; export submissions CSV. Public route is `/forms/<orgSlug>/<formSlug>`. Public submit creates/updates a contact, records an intake submission/note, assigns the first stage if needed, and attempts a Gmail acknowledgment.
- Gates: authenticated org member. `customForms` is marked unavailable on No plan in the plan matrix, but no custom-form assertion is called by these server actions; currently form mutations are not plan-gated. Preserve this until you approve any logic change.
- Confirmed correction: no form delete action was found. The dashboard loads submission counts, not a submission table; an exported CSV action exists. `getSubmissionContactPreview` is defined but has no caller in the route/component scan.
- Runtime verification: `[ ]` form edits/publish/duplicate, CSV export, custom fields, public submit/contact creation, email side effect.

### Playbooks / SOPs

- `[x]` Route `/dashboard/sops`; `app/dashboard/sops/page.tsx`; `components/sops-client.tsx`.
- Data: workspace SOP metadata, visibility, version, uploader, and file metadata.
- Existing actions: manager upload via signed Supabase Storage URL, set/update version, change visibility, delete, view signed URL, manager-only download. Members only receive `all_members` rows and may view shared documents. UI accepts PDF, DOC/DOCX, PNG/JPG and checks a 20 MB maximum in the client.
- Gates: authenticated member; upload/edit/delete/download restricted to CEO/Owner and Admin; manager-only visibility is hidden from Members. No plan gate. The 20 MB size check is in the client UI; the inspected record action does not repeat that size validation server-side.
- Runtime verification: `[ ]` supported file upload/view/download, manager/member visibility, version, delete, size rejection.

### Workspace

- `[x]` Route `/dashboard/workspace`; `app/dashboard/workspace/page.tsx`; `components/workspace-client.tsx`.
- Data: active workspace name, kind, and logo URL.
- Existing actions: update name; prepare signed logo upload; save/remove logo. Logo UI accepts images and checks a 5 MB maximum in the client.
- Gates: CEO/Owner and Admin only; other workspace roles redirect to `/dashboard`. No plan gate. The inspected server actions do not repeat the 5 MB check.
- Runtime verification: `[ ]` name save, logo upload/remove, permission denial, size validation.

### Autopilot: Status / Automation

- `[x]` Existing route `/dashboard/automation`; `app/dashboard/automation/page.tsx`; `components/automation-client.tsx`; live-service definitions in `lib/mock-services.ts`.
- Data: `org_automations`, per-service settings, Google/Twilio status, enabled rule count, and up to 25 recent email activity entries.
- Existing live toggles: inquiry auto-reply (`email-auto-ack`) and booking SMS reminders (`sms-reminders`). Settings include excluded email domains and SMS hours/message template. Auto-reply requires Google and an enabled rule; SMS requires Twilio. Auto-reply starts/stops a Gmail watch.
- Gates: CEO/Owner and Admin; enabling email automation and SMS requires Pro/Business. Server action rejects `email-follow-up`, `form-thanks`, and `lead-intake-sorter` as unavailable; they must not be presented as working controls. `mock-services.ts` currently lists only the two live services despite its filename.
- Runtime verification: `[ ]` toggle persistence, prerequisites, plan rejection, Gmail watch start/stop, settings, activity.

### Autopilot: Rules

- `[x]` Existing route `/dashboard/email-rules`; `app/dashboard/email-rules/page.tsx`; `components/email-rules-client.tsx`.
- Data: rules ordered by priority then creation time, and available template keys including `gmail_auto_ack`.
- Existing actions/fields: create, enable/disable, delete; name, priority, sender email/domain, subject contains, new-contact-only, action (`auto_ack`, `tag_only`, `skip`), optional tag/template, initially enabled checkbox.
- Gates: CEO/Owner and Admin through middleware/server manager assertions; create/enable assert Pro/Business. Rule matching is used by Gmail notification processing.
- Runtime verification: `[ ]` all rule fields, ordering/matching, toggle and delete, Pro lock.

### Autopilot: Templates

- `[x]` Existing route `/dashboard/templates`; `app/dashboard/templates/page.tsx`; `components/template-client.tsx`.
- Data: workspace templates; default keys include `gmail_auto_ack` and `form_thanks`; additional stored keys are loaded.
- Existing actions: add a local template draft, edit subject/body, save, delete non-default templates, test-send to an email via Gmail. Template interpolation supports `{{first_name}}` and `{{business_name}}`. `gmail_auto_ack` cannot be deleted. A test send requires a saved template and a connected Google account.
- Gates: CEO/Owner and Admin. No plan assertion on template actions. Templates are used by rule-driven Gmail auto-ack; public intake acknowledgment currently uses a fixed body in its action.
- Runtime verification: `[ ]` save/delete, interpolation, test send, default-key preservation.

### Autopilot: Unmatched

- `[x]` Existing route `/dashboard/unmatched`; `app/dashboard/unmatched/page.tsx`; `components/unmatched-client.tsx`.
- Data: up to 100 pending unmatched email rows.
- Existing actions: convert sender to a contact/lead or ignore; records resolution status and contact link.
- Gates: CEO/Owner and Admin through manager-only middleware/navigation; no plan assertion was found in the unmatched server actions, despite the plan-gate module comment describing email rules plus unmatched routing.
- Runtime verification: `[ ]` convert, ignore, status updates, cross-workspace access, plan behavior as currently implemented.

### Connections / Integrations

- `[x]` Route `/dashboard/integrations`; `app/dashboard/integrations/page.tsx`; Google disconnect button, Twilio card, Arketa card.
- Data: Google connection email; Twilio number; Arketa locations, calendar IDs, sync status, and instructor-email mappings.
- Existing actions: Google OAuth connect/disconnect; Twilio save/disconnect/test SMS; Arketa save/edit/delete/test credentials/sync. Arketa sync can create, update, and delete matching Google Calendar events.
- Gates: page is manager-only. Google and Arketa actions allow CEO/Owner and Admin. Twilio connection actions and test SMS are CEO/Owner only. No plan gate.
- Runtime verification: `[ ]` OAuth, disconnect, Twilio validation/test, Arketa validation/mapping/sync, role enforcement.

### Team

- `[x]` Route `/dashboard/team`; `app/dashboard/team/page.tsx`; `components/team-client.tsx`.
- Data: workspace member roles/profile display names and pending/revoked/accepted invites.
- Existing actions: create one-time invite link for an email/role; copy link; revoke invite. Invitee must sign in using the invited email and accept at `/invite/<token>`. Invite creation does not send an email. Current team list is read-only here.
- Gates: CEO/Owner and Admin; invites require Starter/Pro/Business and enforce seat limit against current members plus pending invites (2/10/25 seats by paid plan).
- Runtime verification: `[ ]` invite creation/link, exact-email match, join, revoke, seat limits, role enforcement.

### My Workspaces

- `[x]` Route `/dashboard/orgs`; `app/dashboard/orgs/page.tsx`; `components/orgs-client.tsx`.
- Data: current user's memberships, workspace names/roles, active selection.
- Existing actions: switch active workspace; persists profile `active_organization_id` and `jns_active_org` cookie, then reloads dashboard.
- Gates: authenticated user; only a workspace membership authorizes a switch. No plan gate.
- Runtime verification: `[ ]` switching across workspaces and role/data isolation.

### Billing

- `[x]` Route `/dashboard/billing`; `app/dashboard/billing/page.tsx`; `components/billing-client.tsx`; checkout button `components/pricing-checkout-button.tsx`.
- Data: organization plan, billing status/provider/period end and plan limits.
- Existing actions: monthly Starter/Pro/Business Lemon Squeezy checkout; return to `/dashboard?billing=success`; provider webhook updates subscription/plan. Manual Philippines bank/e-wallet note is present. Platform admin can set/clear plans and period end in JNS Admin.
- Gates: authenticated workspace manager for purchase/change; Member billing view is read-only in the client, though middleware also treats Billing as manager-only. No annual checkout/toggle exists in current checkout code.
- Runtime verification: `[ ]` checkout redirect/webhook, manual plan assignment, period expiration, Member/manager access.

### JNS Admin

- `[x]` Routes `/admin` and `/dashboard/admin`; `app/admin/page.tsx`, `app/dashboard/admin/page.tsx`; `components/admin-client.tsx`; mutations in `app/admin/actions.ts`.
- Data: user profiles and organizations with plan, billing status/provider/period and notes.
- Existing actions: approve/reject user; set platform role; remove user; generate password reset link; set/clear/renew workspace subscription; expire overdue subscriptions; refresh pages.
- Gates: platform admin only (`super_admin` role or existing email fallback). `/dashboard/admin` also passes through the dashboard membership/onboarding layout.
- Runtime verification: `[ ]` platform-role checks, each admin mutation, generated reset link, billing updates.

## Public, Auth, and Onboarding Routes

| Route | Source/component | Data and existing actions | Gates / verification |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` and landing styles | Public product/home page; links to product, auth, and marketing routes. No workspace data. | Public. `[ ]` link/navigation regression. |
| `/business-workflow-automation` | `app/business-workflow-automation/page.tsx` | Public SEO/marketing content. | Public/static. `[ ]` links. |
| `/client-management-software` | `app/client-management-software/page.tsx` | Public SEO/marketing content. | Public/static. `[ ]` links. |
| `/crm-software` | `app/crm-software/page.tsx` | Public SEO/marketing content. | Public/static. `[ ]` links. |
| `/login` | `app/login/page.tsx`; `app/login/actions.ts` | Sign in, sign up, forgot-password email, signup names, safe `next` redirect, invite email prefill. | Supabase Auth. `[ ]` sign-in/up/reset/callback and safe redirect. |
| `/auth/callback` | `app/auth/callback/route.ts` | Exchange auth code, sync profile name/status, route invite and onboarding users, then dashboard. | Auth callback. `[ ]` callback and redirects. |
| `/reset-password` | `app/reset-password/page.tsx` | URL alias that preserves query and redirects to `/auth/reset-password`. | Public alias. `[ ]` query preservation. |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Exchange recovery code, validate session, set new password. | Supabase Auth. `[ ]` expired/valid recovery flows. |
| `/pending-approval` | `app/pending-approval/page.tsx` | Static rejected-account information. | Public status screen. `[ ]` auth redirects. |
| `/onboarding/account-type` | `app/onboarding/account-type/page.tsx`; `components/account-type-client.tsx`; actions beside route | Choose individual or business; individual creates personal workspace; business continues to setup. Handles existing invite memberships. | Authenticated, rejected users blocked. `[ ]` both paths/invited user. |
| `/onboarding/setup-business` | `app/onboarding/setup-business/page.tsx`; `components/setup-business-client.tsx`; actions beside route | Create business workspace via `create_organization_with_ceo`, set active workspace/profile. | Authenticated; rejected/already-member redirect. `[ ]` create and recovery. |
| `/invite/[token]` | `app/invite/[token]/page.tsx` and `actions.ts` | Load invite, sign in/up with exact invited email, join workspace, set active org/cookie, mark invite accepted; sign out if email mismatch. | Pending invite and email match required. `[ ]` pending/revoked/accepted/mismatch cases. |
| `/book/[orgSlug]` | `app/book/[orgSlug]/page.tsx`; `components/public-booking-client.tsx`; `app/book/[orgSlug]/actions.ts` | Public org lookup by slug (UUID fallback), booking form, contact upsert, pipeline assignment, booking creation, Google Calendar event attempt. | Public. `[ ]` valid/invalid org, validation, booking data and calendar integration. |
| `/forms/[orgSlug]/[formSlug]` | `app/forms/[orgSlug]/[formSlug]/page.tsx`; `components/intake-form-client.tsx`; route `actions.ts` | Public published form and dynamic fields; submit validates, upserts contact, adds note/submission, assigns stage, attempts Gmail ack. | Public published forms only. `[ ]` field validation, contact/submission, acknowledgment. |
| `/support` | `app/support/page.tsx` | Public support content. Separate from authenticated floating feedback bubble. | Public. `[ ]` links. |
| `/privacy` | `app/privacy/page.tsx` | Public legal content. | Public/static. `[ ]` link. |
| `/terms` | `app/terms/page.tsx` | Public legal content. | Public/static. `[ ]` link. |

`app/robots.ts`, `app/sitemap.ts`, root/global error boundaries, and the legacy file `app/page.tsx(old before plasmic)` are not dashboard product pages. The latter is not an App Router page route.

## API Routes and Third-Party Data Flows

- Google OAuth: `GET /api/google/connect` and `GET /api/google/callback` request Gmail read/send and Calendar events scopes, bind OAuth state to active workspace, and persist tokens/connected email. `POST /api/google/webhook` processes Gmail Pub/Sub notifications. Rule processing matches sender, domain, subject, and new-contact state; unknown senders with no matching rule remain in Unmatched, and matching rules may skip, tag/link, or send templated auto-reply. Gmail watch starts/stops when auto-reply is toggled.
- Google Calendar: booking create/public booking and Arketa sync create/update/delete calendar events where connection/token data permits. Optional booking invite email is an explicit checkbox and off by default.
- Twilio SMS: workspace credentials are stored per org in `twilio_connections`; test SMS is owner-only. `GET /api/cron/sms-reminders` requires `CRON_SECRET`, reads enabled org automations/settings, and sends due reminders. Manual sending is also available on Bookings.
- Arketa: owner/admin-managed location rows hold partner ID, API key, calendar mapping, and instructor email map; actions verify API credentials and trigger location sync. `GET /api/cron/arketa-sync` is protected by `CRON_SECRET`.
- Lemon Squeezy: `POST /api/billing/checkout` uses API/store/variant configuration and manager authorization; `POST /api/billing/webhook` validates HMAC signature and updates organization subscription fields.
- Resend: support feedback action sends to the configured JNS support address using `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; errors are returned inline to the support bubble.
- Supabase is the auth, database, and storage layer throughout. SOP and workspace logo uploads use signed Storage upload URLs.

## Redesign Label Map (Visible Labels Only)

| Existing label | Requested visible label | Existing route remains |
| --- | --- | --- |
| Overview | Today | `/dashboard` |
| Contacts | Clients | `/dashboard/contacts` |
| Pipeline | Journey | `/dashboard/pipeline` |
| Bookings | Schedule | `/dashboard/bookings` |
| Forms | Intake forms | `/dashboard/forms` |
| Automation, Email rules, Templates, Unmatched email | Autopilot with Status/Rules/Templates/Unmatched tabs | Keep all current URLs; matching-tab redirects/selection require approval in Step 1/2 because they affect route/navigation behavior. |
| SOPs | Playbooks | `/dashboard/sops` |
| Integrations | Connections | `/dashboard/integrations` |

## Audit Findings to Carry into Approval

1. No pipeline reorder control/action exists; add, rename, delete, and contact-stage assignment do exist.
2. Custom forms are represented in the plan matrix but are not server-action gated; the current behavior allows org members to create/edit forms regardless of plan.
3. Unmatched actions have no explicit plan assertion, although a billing helper comment groups unmatched routing with email rules. Automation/rules/team gates are enforced by server actions.
4. Booking manual reminder sending checks enabled automation and Twilio but does not independently assert the SMS plan. Preserve current behavior unless you approve a logic change.
5. Form deletion is not implemented. The dashboard displays submission counts and exports submissions; no submission list is rendered. A submission-contact preview server action exists but has no current caller.
6. Existing roles include Assistant. Twilio is Owner-only even though Google and Arketa permit Owner/Admin.
7. Some UI/service entries are not working automations: server actions explicitly reject email-follow-up, form-thanks, and lead-intake-sorter. Only inquiry auto-reply and SMS reminders are live toggles today.
8. The proposed bottom bar/More sheet, Autopilot tab consolidation, redirects, setup ring, inquiry flow strip, and shared design system are not present today. They require a separate approved phase; no route, API, data, permission, plan, or template-key changes are included in this audit.

## Verification Checklist (Step 4, Not Yet Run)

- `[ ]` Owner with No plan: preserve all existing access and locks; exercise enabled/locked paths.
- `[ ]` Owner with paid plan: verify Pro/Business features and Starter seat/form behavior against current server actions.
- `[ ]` Member and Assistant: verify manager pages, shared SOP visibility, workspace switching, contact and booking actions.
- `[ ]` Check all existing routes and legacy Autopilot URLs after any approved navigation change.
- `[ ]` Test forms, CSV import/export, invites, uploads, Google OAuth/Gmail/Calendar, Twilio, Arketa, Lemon Squeezy, and Resend with authorized test accounts.
- `[ ]` Run lint, TypeScript/build, and existing tests; inspect browser console.
- `[ ]` Check 360px, 768px, and 1440px layouts and verify no horizontal page scroll at 360px.

# JNS Systems — Verified Architecture Baseline

**Audit date:** 2026-11-18  
**Repository:** `jns-platform`  
**Status:** Repository-verified against `main` at `aeab836`; live deployment and database configuration are not independently verified

The audited baseline is `main` at `aeab836`; this documentation-only branch is based on that commit. The Playbooks changes and `jns-multi-agent-phase-1/` starter pack from the separate `fix/playbooks-upload-view-actions` branch are excluded from this audit contribution.

This document records repository evidence and package versions locked on `main`. It is not a review of the live Supabase project, provider dashboards, production environment, or deployment settings.

## 1. Application architecture

JNS Systems is a single Next.js App Router application. UI rendering, server actions, API route handlers, integration clients, and domain helpers live in this repository; no separate backend service is present in the inspected tree.

```text
Browser
  ├─ Next.js pages and client components
  ├─ Supabase Auth session in SSR-managed cookies
  └─ Public forms, booking pages, and login flows
           │
           ▼
Next.js App Router
  ├─ Server Components and Server Actions
  ├─ Route Handlers under app/api/
  ├─ Root proxy.ts for session and route/role checks
  └─ lib/ domain and provider modules
           │
           ├─ Supabase Auth and Postgres
           ├─ Google OAuth, Gmail, Pub/Sub, and Calendar
           ├─ Twilio SMS
           ├─ Resend email
           ├─ Lemon Squeezy checkout and subscription webhooks
           └─ Arketa classes API
                    │
                    ▼
             Vercel deployment
             └─ Five scheduled paths in vercel.json; four route handlers exist
```

### Request and data flow

- `app/` uses the App Router. Most authenticated pages load data server-side from Supabase; client components in `components/` provide interactive screens.
- Server Actions (files marked `"use server"`) handle many authenticated create/update operations and revalidate affected routes.
- Route Handlers provide OAuth callbacks, public webhooks, billing operations, and scheduled jobs.
- Supabase access is wrapped by `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server with Next cookies), and `lib/supabase/admin.ts` (server-only service-role client).
- `proxy.ts` refreshes the Supabase session and checks authentication for `/dashboard`, `/admin`, and `/onboarding`. It also checks the platform-admin and organization-manager routes.
- Organization context is resolved using memberships, the profile's active organization, and the `jns_active_org` cookie (`lib/org/`).
- No separately deployed API or background-worker service is represented in the repository.

## 2. Verified technology and package management

The `main` package manifest and lockfile verify these direct dependency versions; the source checkout's `npm ls --depth=0` output was used as a cross-check:

| Technology | Locked version |
|---|---:|
| Next.js | 16.3.0 |
| React / React DOM | 19.2.8 |
| TypeScript | 5.9.3 |
| `@supabase/ssr` | 0.12.4 |
| `@supabase/supabase-js` | 2.112.3 |
| ESLint / `eslint-config-next` | 9.39.5 / 16.3.0 |
| Tailwind CSS | 4.3.3 |
| `@base-ui/react` | 1.7.0 |
| `shadcn` | 4.16.2 |

`package-lock.json` is present and `package.json` has no `packageManager` field. The verified package manager is npm. The UI also uses Lucide icons, `clsx`, `tailwind-merge`, `class-variance-authority`, and `tw-animate-css`. Styling is configured through Tailwind's PostCSS plugin and app CSS.

## 3. Repository map

| Path | Responsibility |
|---|---|
| `app/` | App Router pages, layouts, error/loading states, Server Actions, API handlers, sitemap, and robots metadata |
| `app/dashboard/` | Authenticated workspace: contacts, pipeline, bookings, forms, email rules, automation, templates, unmatched messages, team, SOPs, billing, integrations, workspace settings, and dashboard admin |
| `app/api/` | Google OAuth/webhook endpoints, billing checkout/webhook endpoints, and four implemented cron endpoints |
| `app/auth/`, `app/login/`, `app/invite/`, `app/onboarding/` | Authentication callbacks and reset flow, login, invitations, and workspace onboarding |
| `app/book/`, `app/forms/` | Public organization booking and intake-form routes |
| `app/admin/` | Platform-admin page and actions |
| `app/` marketing/legal pages | Home, CRM/client-management/workflow landing pages, support, terms, privacy, and pending-approval |
| `components/` | Shared and feature-specific interactive clients and UI primitives; includes `dashboard/`, `platform/`, `ui/`, and `workspaces/` subfolders |
| `lib/` | Supabase clients, auth/org helpers, billing, contacts, forms/email, bookings, pipeline, SMS, Google, and Arketa modules |
| `lib/tasks/` | Task types and notification helper code; no task reminder route or dashboard tasks page is present in this checkout |
| `scripts/check-env.mjs` | Environment-variable presence check; does not validate provider connectivity |
| `scripts/sql/` | Four manually applied SQL patches for onboarding fields, niche/reminder fields, and Arketa sync/observability fields |
| `tests/` | One Node test file covering auth redirect and invite-email helper behavior |
| `public/` | Logos, screenshots, and static assets |
| `docs/` | Existing redesign-port plan plus this architecture baseline and task board |
| Root configuration | `package.json`, npm lockfile, `next.config.ts`, `proxy.ts`, TypeScript, ESLint, Tailwind/PostCSS, shadcn config, and `vercel.json` |

The current tree also contains `app/page.tsx(old before plasmic)`, a backup-like filename that is not part of the normal `.tsx` route naming convention. Its purpose and retention should be clarified before cleanup.

## 4. Routes and current functionality

The production build enumerated these route groups:

- **Marketing and public information:** `/`, `/crm-software`, `/client-management-software`, `/business-workflow-automation`, `/support`, `/terms`, `/privacy`, `/pending-approval`, `/robots.txt`, and `/sitemap.xml`.
- **Authentication and onboarding:** `/login`, `/auth/callback`, `/auth/reset-password`, `/reset-password`, `/invite/[token]`, `/onboarding/account-type`, and `/onboarding/setup-business`.
- **Workspace application:** `/dashboard` and `/dashboard/{admin,automation,billing,bookings,contacts,contacts/[id],email-rules,forms,integrations,orgs,pipeline,sops,team,templates,unmatched,workspace}`.
- **Platform administration:** `/admin`.
- **Public workspace features:** `/book/[orgSlug]` and `/forms/[orgSlug]/[formSlug]`.
- **API routes:** `/api/billing/{checkout,webhook}`, `/api/google/{connect,callback,webhook}`, and implemented `/api/cron/{arketa-sync,email-reminders,gmail-watch-renew,sms-reminders}`.

Feature areas evidenced by the routes, components, and data access include organization/workspace setup and membership, contact records and notes, pipeline stages, bookings and public booking, intake forms and submissions, email rules/templates/automation and unmatched Gmail messages, team invites, SOPs, billing/trials/plan gates, Google and Twilio connections, and Arketa-to-Google-Calendar synchronization.

## 5. Supabase, authentication, and data access

- Supabase Auth is used for user sessions and sign-in; SSR clients pass session cookies between browser and server. Server code generally calls `auth.getUser()`.
- The app queries Supabase Postgres directly with `supabase-js`; no ORM or separate data-access service is present.
- Tables referenced by application code include `profiles`, `organizations`, `org_members`, `invites`, `contacts`, `contact_notes`, `pipeline_stages`, `bookings`, `intake_forms`, `intake_submissions`, `email_rules`, `email_templates`, `email_activity`, `unmatched_emails`, `org_automations`, `org_automation_settings`, `connections`, `twilio_connections`, `arketa_locations`, `arketa_class_events`, `sms_activity`, `org_sops`, and `system_cron_runs`.
- `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY`. It is used in server-side pages, actions, and provider/background modules. This client bypasses RLS; each call path therefore depends on its own authentication, organization-membership, and role checks.
- There is no `supabase/` or `database/` directory, no checked-in migration history, and no generated Supabase `Database` type in the inspected source. The four SQL files are standalone patches, not an ordered migration system.
- The repository does not establish the live schema, foreign keys, RLS enablement/policies, triggers, or production data-retention configuration.

## 6. Integrations and scheduled work

| Integration | Repository behavior |
|---|---|
| Supabase | Auth, Postgres queries, and a service-role client for privileged server-side operations |
| Google | OAuth connects Gmail read/send and Calendar event scopes; tokens are stored in `connections`; Gmail Pub/Sub notifications process inbound mail; Google Calendar is used for bookings and Arketa sync |
| Twilio | Per-organization credentials are read from `twilio_connections` to send SMS and log `sms_activity` |
| Resend | Support feedback and booking/automation email delivery |
| Lemon Squeezy | Authenticated checkout creation; subscription webhook checks an HMAC signature and updates organization billing state |
| Arketa | Classes are fetched and reconciled with Google Calendar events; sync status and failures are recorded in Supabase |
| Vercel Cron | `vercel.json` schedules SMS reminders (`0 14 * * *`), email reminders (`0 */6 * * *`), Arketa sync (`0 15 * * *`), Gmail watch renewal (`0 12 * * *`), and `/api/cron/task-reminders` (`0 15 * * *`). Four matching route handlers exist; there is no `app/api/cron/task-reminders/route.ts` in this checkout. |

The task-reminders schedule therefore points to a route that is absent from the repository. Confirm whether the route is intended to be implemented or the schedule removed before relying on it. Vercel project linkage and active schedules were not independently inspected.

Each cron handler checks a bearer token against `CRON_SECRET`. The repository does not prove that the Vercel project has these schedules enabled or that production secrets/provider settings are configured.

### Environment variable names found in code

Names only are listed here; values are intentionally excluded.

| Name(s) | Use |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser/server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side Supabase client; must remain server-only |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Outbound Resend email |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_PUBSUB_TOPIC` | Google OAuth and Gmail push watch |
| `ENCRYPTION_KEY` | Optional application encryption for Google tokens and Arketa API keys |
| `CRON_SECRET` | Bearer authentication for scheduled routes |
| `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_STARTER`, `LEMONSQUEEZY_VARIANT_PRO`, `LEMONSQUEEZY_VARIANT_BUSINESS`, `LEMONSQUEEZY_WEBHOOK_SECRET` | Lemon Squeezy checkout and webhook |
| `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, `VERCEL_ENV`, `NODE_ENV` | App origin selection and runtime/deployment behavior |

`NEXT_PUBLIC_*` values are intentionally exposed to browser code; service-role, provider API, OAuth client-secret, cron, billing, and encryption keys must be server-side. `check:env` checks for five required names (Supabase URL/anon key, service-role key, and the two Resend settings) and recommends `CRON_SECRET`, Google OAuth settings, and `ENCRYPTION_KEY`. It does not check the Lemon Squeezy names or provider connectivity.

`lib/crypto/secrets.ts` encrypts with AES-256-GCM when `ENCRYPTION_KEY` is configured, but deliberately passes new values through as plaintext when the key is absent. The implementation accepts a configured key of 16 or more characters, while `check:env` prints guidance calling for 32+ characters. Existing encrypted values cannot be decrypted without the key. On 2026-11-18, `check:env` reported the five required names and four recommended names missing; only variable names/status were emitted, never values.

## 7. Build, development, and quality checks

| Purpose | Command | Repository definition |
|---|---|---|
| Install from lockfile | `npm ci` | `package-lock.json` is present |
| Development server | `npm run dev` | `next dev` |
| Production build | `npm run build` | `next build` |
| Start built app | `npm run start` | `next start` |
| Lint | `npm run lint` | `eslint` |
| Tests | `npm test` | `node --test tests/auth-routing.test.mjs` |
| Environment presence check | `npm run check:env` | `node scripts/check-env.mjs` |

There is no standalone `typecheck` script; the earlier successful production build ran Next.js TypeScript validation. There is no root `.github/workflows/` directory or checked-in CI configuration. `vercel.json` contains cron schedules only; project linkage, build settings, production branch, and deployment protections are not established by this repository.

### Validation evidence and limits

- `npm ls --depth=0` completed on the source checkout during audit preparation. The audit-only baseline uses the versions locked on `main`; the source checkout had one additional feature dependency which is excluded here.
- `npm run check:env` on 2026-11-18: reported five required and four recommended names missing. It checks presence only and prints names/status, not values.
- The prior audit recorded `npm test` passing four tests, `npm run build` passing, and `npm run lint` failing with one error (`app/auth/reset-password/page.tsx:23`, `react-hooks/set-state-in-effect`) plus 15 warnings. Those results are dated 2026-11-14 and were not rerun during this audit; treat them as historical results only.
- `npm run dev`, `npm run start`, `npm run lint`, `npm test`, `npm run build`, and `npm run check:env` are the scripts present in `package.json`. No standalone typecheck script is defined.

## 8. Architecture risks and technical debt to resolve

These are repository-level findings and follow-up areas, not proof of a production incident.

1. **Privileged database access:** the service-role client is used broadly. Map and test authorization at every server action, public route, and job that uses it; do not assume RLS protects those calls.
2. **Schema ownership:** schema and RLS cannot be reconstructed from the repository. SQL patches are manual and no migration order/history or generated DB types is checked in.
3. **Secret-at-rest behavior:** encryption is optional and plaintext pass-through is implemented when `ENCRYPTION_KEY` is missing. Confirm policy and deployed key management before treating stored integration credentials as encrypted.
4. **Authorization sources can drift:** `proxy.ts` maintains its manager-only route list separately from `MANAGER_ONLY_PATH_PREFIXES` in `lib/org/roles.ts`; the latter has no call sites and omits paths guarded by the proxy. The active `isOrgManagerRole` helper is shared, but the path lists can diverge. Establish one source of truth and test route/action permissions.
5. **Duplicate session logic:** `lib/supabase/middleware.ts` exports `updateSession` but has no call sites; the root `proxy.ts` independently creates a Supabase client and implements session/route checks.
6. **Thin automated coverage:** the four tests target two pure helpers. No integration tests for Supabase actions, authorization, provider callbacks/webhooks, cron processing, or billing behavior are present.
7. **No automated CI gate:** no repository workflow runs lint, tests, or build on pull requests. Current lint failure means enabling it as a required check needs an agreed baseline and remediation.
8. **Environment verification is incomplete:** the checker omits Lemon Squeezy variables, does not verify connectivity, and cannot confirm Vercel/provider setup.
9. **Scheduled route mismatch:** `vercel.json` includes `/api/cron/task-reminders`, but no matching route handler is in the checkout. The `lib/tasks/` helpers alone do not provide an HTTP endpoint.
10. **Gmail push handling:** `app/api/google/webhook/route.ts` parses the Pub/Sub body without checking a request authorization token in the handler. It also returns HTTP 200 on processing errors, which suppresses Pub/Sub retries. Confirm the push subscription's authentication and intended retry policy.
11. **Documentation drift:** the root README remains mostly the generic create-next-app guide. `docs/redesign-port-plan.md` is branch-specific, not current system architecture.
12. **UI ownership:** similarly named StatCard primitives exist under dashboard, platform, and UI folders. Clarify reuse conventions before parallel component work.
13. **Unclassified backup file and stale helper:** clarify whether `app/page.tsx(old before plasmic)` and the uncalled `lib/supabase/middleware.ts` session helper are retained. Avoid cleanup until ownership is agreed.

## 9. Questions requiring owner or environment verification

- Which Supabase schema/migrations and RLS policies are authoritative, and where should they live?
- Which production and preview branches/environments are connected to Vercel, and are the five configured cron schedules active? Is `/api/cron/task-reminders` intended to exist?
- What is the approved policy for encrypted integration secrets, key rotation, and legacy plaintext rows?
- What is the canonical authorization rule set for platform admins, organization owners/admins, and members, especially for Server Actions and service-role queries?
- Is the Gmail Pub/Sub push endpoint authenticated/configured outside the route handler? The handler parses push payloads but no request authentication check is visible in the route code.
- Is the current `ENCRYPTION_KEY` minimum intended to be 16 characters (implementation) or 32+ (environment-check guidance)?
- Is manual plan activation (mentioned in landing-page copy) an implemented operator workflow or a process outside this repository?
- Should duplicated/legacy helpers and UI primitives be consolidated, or retained for compatibility?

## 10. Phase 2 recommendations

After human approval, prioritize:

1. Establish an authoritative schema/migration and RLS inventory with generated database types; verify it against the actual Supabase project before modifying schema.
2. Map authentication and organization authorization across every route/action, especially service-role call sites; add focused tests before changing behavior.
3. Confirm deployment environments and required provider variables without copying values into code or documentation; decide and operationalize encryption/key-rotation requirements.
4. Agree a minimal CI pipeline for lint, tests, and build; resolve or explicitly baseline current lint findings before making checks required.
5. Expand tests for multi-tenant authorization, OAuth/webhook verification, cron idempotency, billing transitions, and high-impact contact/booking operations.
6. Define component/module ownership and one source of truth for authorization path policy before parallel feature work.
7. Update the root README with verified npm commands and local setup guidance once environment and database provisioning instructions are approved.
8. Resolve the unmatched task-reminders cron path and confirm the Gmail Pub/Sub authentication/retry contract before changing either integration.

This 2026-11-18 audit contribution contains documentation only and is based on `main` at `aeab836`. No application source, dependency, environment, database, or deployment files were changed. It has not been pushed, merged, or deployed.

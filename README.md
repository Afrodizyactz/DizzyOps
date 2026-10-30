# DizzyOps

AfrodizzyActs operations portal.

## Entry points

- **Login landing page:** https://afrodizzyacts.github.io/DizzyOps/ (GitHub Pages staging)
- **Planned production domain:** https://ops.afrodizzyacts.co.za/ (DNS and secure identity hosting not yet configured)
- **Operations UI preview:** https://afrodizzyacts.github.io/DizzyOps/portal.html (public development preview only, no protected data)

The default `index.html` is the branded mobile-first Google Workspace sign-in page. The original operations workspace is preserved in `portal.html` for design and workflow review.

**SSO is not live.** The sign-in button remains disabled until the approved Google Workspace SAML service provider, same-origin `/auth/saml/login` endpoint, verified backend sessions, and server-side authorization are deployed and tested. A public static page or custom domain is not an authentication boundary.

The development preview does not connect production records, database persistence, or external integrations. Do not enter personal, customer, performer, payroll, or sensitive business data into GitHub Pages.

## Documentation

- [Login landing, custom domain and deployment gates](docs/login-landing-and-domain.md)
- [Google Workspace SAML SSO](docs/google-workspace-sso.md)
- [Post-job Google Workspace integration](docs/post-job-google-workspace-integration.md)

## Phase 01 navigation and financial module previews

DizzyOps now includes a shared route registry, improved responsive mobile navigation and linked Quotes, Finance and Sage UI modules. Financial draft forms remain available only to verified staff on a protected host; **there is no live database or Sage sync**. The public GitHub Pages portal is a design preview and cannot protect real data. See [Phase 01 acceptance checks](docs/phase-01-navigation.md).

## Phase 02 — operational workspaces

Operational modules now have structured forms and validation rules, workflow checklists, search/status/sort controls, responsive empty registers, read-only verified metrics, and secure API wiring prepared for a future backend. No seeded customers, performers, bookings or other business records are included. **No records are saved while the backend is absent**; modules show explicit status messaging. The existing staff session boundary and role checks remain unchanged. See [Phase 02 implementation details](docs/phase-02-business-modules.md).

## Phase 03 — secure backend preparation (not activated)

The repository contains a default-off Cloud Run + Google Identity Platform + Firestore API foundation for the ten operational modules, with authenticated staff-only CRUD, explicit role policy, audit events and optimistic concurrency. No Google Cloud project or billable service has been provisioned, and no live records are stored until an approved admin deployment. The public GitHub Pages portal remains a **design-only preview**. Follow the [Phase 03 operator runbook](docs/phase-03-cloud-runbook.md) for permissions, SAML setup, billing, deployment and go-live tests. Do not commit staff account lists or credentials.

## Phase 04 — SaaS workspace navigation

The portal includes an application directory (`#workspaces`), personal shortcuts/recent modules (`#mywork`), collapsible navigation categories, contextual breadcrumbs, per-page pinning and a keyboard command search (Ctrl/⌘+K or /). Saved navigation preferences contain allowlisted **module IDs only**, scoped to each verified staff user; they do not store customer data or grant business API access. Unauthorized routes remain protected by Cloud Run and server-side permission checks.

The public GitHub Pages deployment remains a **design preview** without live business data. Assigned tasks and notifications are *not connected*: see [Phase 04 implementation and acceptance plan](docs/phase-04-saas-navigation.md). Production SAML, Firestore and SaaS data services require separate administrator activation and validation.

## Phase 05 — Staff Tasks & Activity

A zero-seed **My Tasks & Activity** page (`#tasks`) and real task summary under `#mywork` now support approved staff assignments, linked operational records, status transitions, pagination and append-only audit events. Activation is controlled by `ACTIVITY_API_ENABLED=false` by default and requires production Google Workspace SAML, Firestore and authenticated business APIs. The public GitHub Pages preview does **not** create or display real tasks. See [Phase 05 acceptance and security checklist](docs/phase-05-activity-centre.md).

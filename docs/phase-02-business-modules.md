# Phase 02 — operational business workspaces

## Delivered scope

The shared operations engine now renders structured, accessible, AfrodizzyActs-branded interfaces for:

- Bookings and enquiry/confirmation workflows
- Jobs, performers, availability and assignments
- Clients & CRM, agents and suppliers
- Costumes, props and inventory
- Assets, couriers, dispatch and returns
- Fabrication briefs, milestones and quality checks
- Document metadata, classification and media rights
- Post-job follow-up (Natalie's requested thank-you, feedback, event media, manager follow-up, usage-rights approval)
- Operational dashboard, management reports and administrative readiness

Finance screens built in Phase 01 remain separate and Sage Accounting Online is **not** connected.

## Functionality

Each record module includes responsive register/blank form/workflow tabs; keyboard-operable search, status filters, sorting, pagination controls (when real API cursors exist), labelled fields, required inputs, email/number/date validation, explicit validation feedback, client-side cross-field checks, and a local-only workflow planning checklist. Reporting supports selectable categories and date validation but does not show fabricated results. Settings shows configuration prerequisites but cannot change server permissions.

The shared screen uses all 10 non-finance schemas in `operations-schema.js` and the renderer in `operations-ui.js`; templates/style live in `operations-ui.css`.

**No sample data** is created, imported, fetched from external services or stored in a browser or database. No client names, performer information, job records or fabricated KPI values appear by default.

## Access boundaries

The public GitHub Pages portal remains a **design-only preview**. Business forms may be inspected and locally validated, but they **cannot save** or transmit records and must not be used for confidential information.

The client attempts a capability request only after `/auth/me` has returned a verified staff identity through the existing authentication flow. The server is responsible for all real authentication and authorization. If the future authenticated backend does not return `{version:1, modules:{...}}` from `GET /api/v1/capabilities`, all business CRUD is disabled. Capability flags are UI affordances, not security tokens.

For each module, future secure APIs must enforce per-request staff identity, role, record ownership/job scope, schema constraints, optimistic concurrency (revision), CSRF, pagination limits, audit history, and request validation:

- `GET /api/v1/modules/:slug?limit=25&q=...&status=...&sort=...&cursor=...`: `{items:[],nextCursor:null}`
- `POST /api/v1/modules/:slug`: create after permission and server-side validation
- `PUT /api/v1/modules/:slug/:id`: update with required `expectedRevision`
- `DELETE /api/v1/modules/:slug/:id`: only when an explicit delete capability is granted; not wired to the UI until safe business-specific deletion/retention policies exist
- `GET /api/v1/capabilities`: `{version:1,modules:{Bookings:{read:true,write:true,delete:false},...}}` **is illustrative interface shape, not a production response or permissions configuration.**

Mutations obtain a same-origin CSRF token, use an authenticated same-origin request, and reject non-success results. All API endpoints currently return 404 because Phase 03 data infrastructure is not provisioned.

## Acceptance tests

1. Log in landing page remains unchanged. Unauthenticated users cannot access protected routes on Cloud Run.
2. Open every operational navigation module in GitHub Pages preview: see a zero-record register, blank form and workflow tab.
3. Validate a blank form: required input validation appears, with no record saved.
4. Test date ordering, positive inventory counts, email validation and select options.
5. Switch between records/form/workflow tabs, navigate between modules and exercise search/reset/status controls.
6. Confirm desktop/tablet/mobile cards and navigation at 320px wide. Test full keyboard access, labelled inputs and visible focus.
7. Dashboard KPIs show em dashes instead of zeros or example values. Reports have filters but no fake charts. Settings cannot change staff roles or connector secrets.
8. Run `node --test test/operational-workspaces.test.cjs`, `node --test test/portal-routing.test.cjs`, and `npm test --prefix server`.
9. Production CRUD, performer guest links, PDF exports, uploads, integration write-backs and actual records remain explicitly blocked until the Phase 03 backend is deployed and tested.

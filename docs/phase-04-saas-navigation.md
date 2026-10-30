# DizzyOps Phase 04 — SaaS workspace navigation

## Delivered
- **Application directory** (hash route `#workspaces`): grouped AfrodizzyActs operational, finance, resources and administrative modules; keyword filtering and one-click Open/Pin actions.
- **My workspace** (`#mywork`): user-configured pinned pages, recently visited modules, and an explicitly unconnected assigned-work/notification placeholder. No fake tasks, counts or live records are generated.
- **Global command search**: Ctrl/⌘+K or / outside editable fields; module synonyms, favourites and recent-page priority, Arrow/Enter keyboard support, and safe existing route destinations only.
- **Navigation shell**: accessible collapsible sidebar groups, breadcrumb hierarchy, mobile-safe header links, per-page pin/unpin, copy-page-link and active-page semantics.
- **Role-aware discovery**: when verified staff sign in, modules are filtered by existing server roles and, where returned, the authenticated `/api/v1/capabilities` response. Navigation filtering is for usability only; **the Cloud Run API must still check permission on every request**.
- **Personalisation**: only allowlisted module route identifiers and collapsed navigation group names are stored in localStorage, scoped by server-verified staff UID. No client/performer, financial, token or business data is written into browser storage by this layer. Public preview preferences are isolated from authenticated user preferences.
- **Empty, secure-by-default behaviour**: GitHub Pages remains an unauthenticated preview with no persisted business data. The Phase 03 infrastructure deployment remains an independent administrator-controlled gate.

## Acceptance tests
1. Navigate from the main dashboard to the **Apps** and **My work** header buttons and equivalent sidebar links. Check links, breadcrumbs and Back/Forward in desktop and mobile browsers.
2. Search by user-visible synonyms such as *enquiry*, *customer*, *dispatch*, *sage*, *post-job*. Confirm only known module pages are returned.
3. Toggle pins from the directory and page header; verify pinned section, personal page and persistence across reload. Pinned pages must never bypass an authenticated session or restricted module.
4. Collapse/reopen sidebar groups, verify `aria-expanded`, keyboard focus and active route highlighted. Open mobile More drawer, use keyboard Escape and backdrop close.
5. Test at 320px, 390px, tablet and desktop widths, including reduced-motion preference and screen-reader labels.
6. With real verified staff roles, check that unauthorized modules disappear from discovery; deep-linked denied routes go to the directory. Confirm API still independently rejects unauthorized requests with 403.
7. Confirm **no seeded data**; My work deliberately reports tasks/notifications are not connected.
8. Run `node --test test/portal-shell.test.cjs`, prior route tests, security tests and the existing CI suite.

## Next engineering milestones
1. **Production activation (Phase 03 prerequisite):** admin-owned Google Cloud project, verified SAML/Cloud Run domain, Firestore, Secret Manager and secure session tests.
2. **Actual activity inbox:** server-backed job-scoped assignments, approvals, user notifications, event audit history, reminders and real-time updates, governed by roles and POPIA retention.
3. **Related-record navigation:** booking → quote → job → performer assignment → follow-up → invoicing with server IDs and direct secure links. Never derive permissions from URL hashes or client preferences.
4. **External portals:** expiring, purpose-limited performer and customer actions using token hashes, minimal disclosed data and revocation; no permanent guest accounts by default.
5. **Approved third-party integrations:** Sage Accounting Online, Gmail/Calendar/Drive scopes, and accounting reconciliation with resilient queues and idempotency.
6. **Governance:** product telemetry without PII, server-driven feature flags, audit logs, billing alerts and device/browser regression tests.

The deployed code should not be described as a fully activated SaaS service until the identity and persistent backend have been provisioned, reviewed and accepted.

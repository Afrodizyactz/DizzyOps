# Phase 01 — navigation and module integration

This phase connects the existing Quotes, Finance and Sage readiness scripts to the portal router and improves mobile navigation, deep links, browser Back/Forward, and keyboard support.

**Security:** GitHub Pages remains a *public design preview*. The authenticated Cloud Run host protects `/portal.html`, UI assets and backend access through verified sessions. Public previews do not enable finance drafts. UI staff checks do not replace server-side authentication and RBAC. No test users, sample customer records, bypass links or secrets are added.

**Acceptance checks:**

1. Root `/` remains the branded Google Workspace login landing screen.
2. Public `/portal.html#quotes` stays a design-only workspace; no real financial data should be entered.
3. `/portal.html#integrations` opens Sage readiness status without calling Sage.
4. On the protected host, authenticated staff see the existing Quotes, Invoices, Expenses and Payroll draft interfaces and explicit no-backend notices. No official Sage record is created.
5. Mobile sidebar opens from the hamburger or More menu, closes with backdrop/Escape, traps focus, restores focus, and unlocks scrolling when closed.
6. Search opens via Ctrl/⌘+K. Hash routes, Back/Forward and active navigation update correctly.
7. Test at 320px, tablet and desktop widths, including keyboard-only navigation and reduced-motion.
8. Run `node --test test/portal-routing.test.cjs` and `npm test --prefix server`. The GitHub CI must pass.

**Out of scope:** Firestore, live accounting, production Google Workspace SSO deployment, final data persistence, verified PDF/email dispatch and payment collection. Existing authenticated draft engines are browser-local or memory-only and not suited for sensitive live data until Phase 03.

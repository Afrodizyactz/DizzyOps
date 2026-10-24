# DizzyOps login landing page and custom domain

## Landing page

The root `index.html` is now a dedicated, branded, responsive sign-in page for DizzyOps.

- Expected production entry point: `https://ops.afrodizzyacts.co.za/` (domain is **not yet configured**).
- GitHub Pages staging entry point: `https://afrodizzyacts.github.io/DizzyOps/`.
- Existing operations interface preserved for development review only at `/portal.html`. This file is PUBLIC on GitHub Pages and is **not a protected application**. Never put live records into this preview.
- AfrodizzyActs logo is used on both the landing page and as the browser icon.
- The UI supports phone, tablet, and desktop layouts; keyboard focus; screen readers; reduced-motion preferences; and the organization's black/white/red visual language.
- No demo passwords, sample users, or sample business records.

## Google SAML sign-in wiring

The root page loads `auth/config.js`, then `auth/login.js`. The **button is always clickable**: while SAML is not configured, clicking it opens an accessible setup-status panel and does not authenticate the visitor. When the production SAML endpoint is configured, clicking it redirects to that service. An unconfigured account cannot gain access to protected records from this interaction.

An actual SAML authentication redirect happens only if:

1. `enabled: true` is explicitly set in `auth/config.js`.
2. The page is served over HTTPS.
3. `loginUrl` is a **same-origin** absolute path pointing exactly to `/auth/saml/login`.

A custom SAML service provider/backend (SP) must implement this endpoint. It should initiate a signed or unsigned SAML authentication request as supported by the configured IdP, receive and validate Google's SAML response at its secure ACS, establish a server-side session, and redirect authenticated users into a **protected** application served through the same trusted origin. Validate issuer, signature, audience, InResponseTo, timestamps, recipient/destination, replay protection and explicitly approved user/role assignments. A landing page redirect alone is never proof of authentication.

This configuration intentionally does not enable real sign-in because neither the Cloud Run SP nor the Cloud Identity Platform callback, protected data APIs, and server-side user authorization have been provisioned. Do not change the flag merely to make the button clickable.

**Identity Platform alternative:** if the production team selects Google Cloud Identity Platform as managed SAML SP, implement its client and backend token-verification flow instead of setting `/auth/saml/login` without a corresponding service. The rest of the landing-page design can be retained.

## DNS and deployment decision

**Do not add `CNAME` or change DNS until domain ownership, tenant administrator access and target hosting architecture are approved.**

The recommended production architecture is to route `ops.afrodizzyacts.co.za` to Google Cloud Run / HTTPS load balancer or another controlled HTTPS application origin, serving both the login UI and protected application/API under one origin. This allows `/auth/saml/login`, the ACS URL, and authenticated application routes to work correctly. Configure the Google Workspace SAML app with the SP's **exact** ACS and entity ID values. DNS must be managed by the domain administrator.

A GitHub Pages custom domain can publish the landing page, but **GitHub Pages cannot enforce authentication on `/portal.html` or handle SAML POST responses**; a custom domain alone does not resolve that. If GitHub Pages remains the frontend host, its resources remain public and all confidential content must live behind an independently authenticated backend.

Do not advertise the development preview `/portal.html` as a protected application or rely on `noindex`, a hidden link, or a browser-only JavaScript check to secure it.

## Go-live verification

- Landing page is the default document at `/`; HTTPS and canonical custom-domain redirect work.
- Logo/favicon, responsive breakpoints (320px through desktop), keyboard tab order and screen-reader status are tested.
- SAML certificate matches the Google Admin console and the SP metadata; ACS and entity ID are set accurately.
- Login redirects only to the controlled SP endpoint, not to a hardcoded Google IdP URL.
- An unauthenticated caller cannot load protected user records or access protected backend APIs, including direct route access.
- Approved users receive server-verified roles; unapproved identities are denied.
- Logout destroys the backend session and expires cookies; CSRF, replay, expiry, and signature failure tests pass.
- Performers/contractors who lack Workspace accounts have an independently approved onboarding and identity route.
- No demo data, credentials, signing private keys, or live financial/personnel data are committed into GitHub Pages.

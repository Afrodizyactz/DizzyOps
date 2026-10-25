# DizzyOps — Google Workspace SAML production activation

**Status: application code staged, no cloud project or live login configured.** Google Workspace SSO cannot be enabled solely by committing code to GitHub Pages.

## Runtime architecture

- Staff (14 approved Google Workspace accounts) visit `https://ops.afrodizzyacts.co.za/`.
- Google Cloud **Identity Platform** is the managed SAML service provider (SP); **AfrodizzyActs Google Workspace** is the SAML identity provider (IdP).
- Official Firebase JavaScript SDK initiates SAML redirect, processes the return and passes the resulting ID token to a same-origin Cloud Run backend. No Google password is collected by DizzyOps.
- `server/index.js` verifies Identity Platform ID tokens, the exact SAML provider and *explicit* staff email-to-role mapping before minting a secure eight-hour `__Host-dizzyops-session` cookie.
- Protected routes verify session signature and revocation. State-changing requests validate request Origin and CSRF.
- Performers/customers **do not get staff accounts**. Future scoped links need separate server-side authentication and authorization.
- No sample business records; no real data should be stored in browser-only development preview.

## 1. Google Cloud administrator actions

1. Select or create an AfrodizzyActs-controlled Google Cloud project and enable billing. Confirm budget alerts against the initial R650/month planning budget.
2. Activate **Identity Platform** and create a Web app. Copy its four *public* settings: Firebase `apiKey`, `authDomain`, `projectId`, `appId`.
3. Open [Identity Platform providers](https://console.cloud.google.com/customer-identity/providers) and create a SAML provider with:
   - Provider ID: `saml.afrodizzyacts` (choose exactly this ID; if unavailable adjust server and frontend together)
   - Display name: `AfrodizzyActs Google Workspace`
   - IdP entity ID: `https://accounts.google.com/o/saml2?idpid=C03icveqq`
   - IdP SSO: `https://accounts.google.com/o/saml2/idp?idpid=C03icveqq`
   - IdP public signing certificate: `auth/google-idp-signing-2026.pem`
   - SP Entity ID: planned `https://ops.afrodizzyacts.co.za` — use **exactly** the same value in Google Workspace.
4. **Copy the actual ACS / Authorization Callback URL from Identity Platform.** The exact URL depends on the project and auth domain. Do not use the GitHub Pages URL as ACS.
5. Add `ops.afrodizzyacts.co.za` to authorized domains. For redirect sign-in on Safari/mobile, configure an approved first-party authentication domain/proxy arrangement as described in [Firebase redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices). Avoid relying on third-party cookie access.

## 2. Google Workspace administrator actions

In [Google Admin console](https://admin.google.com) go to **Apps → Web and mobile apps → Custom SAML app** and create/update `DizzyOps`.

- ACS URL = the Identity Platform **generated** callback URL.
- SP Entity ID = **identical** to the Identity Platform provider's SP Entity ID.
- Start URL = `https://ops.afrodizzyacts.co.za/`.
- NameID format = **email address**, NameID = **Primary email**.
- Enable only for the approved staff OU or group (14 users); enforce MFA through Workspace policy.
- Use current IdP public cert, fingerprint **CB:D8:53:3B:CA:C5:38:10:BF:B4:6C:49:50:48:47:8B:0C:CA:79:43:33:05:D2:27:DE:07:9D:45:F2:64:23:63**, valid 24 Oct 2026–23 Oct 2031 UTC. Do not import the uploaded expired 2026 XML metadata.

## 3. Deploy Cloud Run and route domain

1. Build `server/Dockerfile` from repository root, deploy behind an HTTPS public origin, and make `ops.afrodizzyacts.co.za` resolve to the backend via a supported managed frontend, e.g., Firebase Hosting rewrite or HTTPS load balancer.
2. Cloud Run runtime environment: `GOOGLE_CLOUD_PROJECT`, `PUBLIC_ORIGIN=https://ops.afrodizzyacts.co.za`, `SAML_PROVIDER_ID=saml.afrodizzyacts`, `STAFF_ROLE_MAP_JSON`. Last value is a **private**, explicitly approved email-to-role JSON map; an empty map denies all access. Put it in secure Cloud Run configuration/Secret Manager, NOT GitHub.
3. Run Cloud Run using dedicated least-privilege workload identity / Application Default Credentials, not uploaded service-account key files.
4. Update **public** `auth/config.js` Firebase web properties from the project and set `identityPlatform.enabled=true` **only after** provider, Cloud Run session endpoints and correct domain are tested.
5. Keep GitHub Pages at `https://afrodizzyacts.github.io/DizzyOps/` as a public development-only preview or retire it. A GitHub Pages `portal.html` route cannot be protected by the Cloud Run cookie.
6. Every future finance, performer, client and admin API must repeat server-side authorization checks; never rely on a login-page flag or browser route guard.

## 4. Deployment acceptance criteria

- Correct certificate, IdP Entity ID, exact ACS URL and SP Entity ID; assigned Workspace users only.
- SAML completes and the same-origin app exchanges token for HttpOnly/Secure/SameSite session cookie.
- Incorrect signatures/tokens, unapproved users, wrong SAML provider, invalid CSRF/Origin, replay, expired or revoked session are rejected.
- Direct unauthenticated `/portal.html` and `/auth/me` requests are denied on the production host.
- User role is server-derived, not the client or email domain alone. Finance routes require explicit role controls before sensitive data is exposed.
- Logout invalidates the prior session; test Safari/iOS, Chrome/Android and desktop.
- No private signing keys, session tokens, staff lists, customer data, or sample records are published to GitHub.

## Vendor references

- [Identity Platform SAML sign-in](https://docs.cloud.google.com/identity-platform/docs/web/saml)
- [Identity Platform SAML provider administration](https://docs.cloud.google.com/identity-platform/docs/managing-providers-programmatically)
- [Cloud Run end user authentication](https://docs.cloud.google.com/run/docs/authenticating/end-users)
- [Firebase Admin managed session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Google Workspace custom SAML apps](https://support.google.com/a/answer/6087519)

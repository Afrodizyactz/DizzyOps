# DizzyOps — Mandatory Google Workspace SSO

## Security requirement

Google Workspace single sign-on is required before DizzyOps is used with production data. The GitHub Pages frontend is currently a public UI preview and must not be treated as an authenticated application.

## Proposed architecture

- Identity provider: Google Workspace / Google Identity Services (OpenID Connect).
- Sign-in: Authorization Code Flow with PKCE, initiated by a confidential backend-for-frontend (BFF).
- Hosting: Google Cloud Run for the backend; GitHub Pages may continue hosting the public static frontend only while all protected data and API operations are served by the authenticated backend. Prefer serving both frontend and backend under a unified application origin for production.
- Session: backend-managed HttpOnly, Secure, SameSite cookies; server-side session invalidation on sign-out; CSRF protection and session rotation.
- Validation: verify Google ID token issuer, audience, signature, expiry, and hosted domain where applicable; also check an explicit approved-user/role registry. Email domain alone is insufficient for authorization.
- Authorization: deny-by-default RBAC for management, administrators, agents, performers, contractors, and suppliers; enforce authorization on every API request.
- Account menu: show verified name, email, photo and roles only from backend session data; Profile, Settings, Support and Sign Out require appropriate session checks.
- Logout: revoke/invalidate the DizzyOps session. Do not claim to log users out of their entire Google account.
- Secrets: Google OAuth client secret, signing keys and service account credentials stay in Google Secret Manager or equivalent backend configuration, never in the GitHub Pages JavaScript bundle.
- Audit: record sign-ins, role changes, and privileged actions without logging access tokens or sensitive personal data.
- POPIA: least-privilege access, retention policies, access logging and documented lawful processing.

## Prerequisites

1. Google Cloud project under an authorized AfrodizzyActs-controlled account.
2. Authorized Google Workspace administrator approval and OAuth consent configuration.
3. OAuth client ID and backend-held client secret with exact authorized redirect URIs.
4. Approved user/role assignments and policy for external performers/contractors (who may not have Workspace accounts).
5. Backend domain, session storage, and production data service.

## Acceptance criteria

- Anonymous visitors cannot retrieve protected business records or call protected APIs.
- Authorized Workspace users can sign in and see their own profile.
- Unauthorized Google accounts, including accounts from the same domain not explicitly approved, are denied.
- Roles are checked on the server for each protected action.
- Expired sessions and sign-out deny subsequent protected requests.
- Mobile and desktop login and logout flows pass end-to-end testing.

**Status:** Architecture requirement documented. SSO is NOT yet configured or deployed.

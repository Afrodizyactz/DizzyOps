# DizzyOps production architecture — staff-only identities and secure guest links

## Access model
- **14 existing Google Workspace staff accounts** are the only persistent portal identities. No new Workspace licences are assumed.
- Staff sign in using Google OpenID Connect (authorization-code + PKCE) through a confidential Cloud Run backend. Validate issuer, audience, nonce, hosted domain, and verified email; enforce an explicit server-managed allowlist of authorized staff and RBAC. Domain membership alone is insufficient.
- Performers, artists, event managers and customers **do not receive accounts**. Staff generate purpose-specific expiring links for individual actions: confirm a job, provide availability, submit feedback, approve a quote, upload media or review an invoice. Guest access never reveals the staff dashboard or other jobs.
- Links must be unguessable (at least 256 bits from a CSPRNG), short-lived, single-purpose, revocable and rate-limited. Store **only a keyed hash** of each token in Firestore; never log raw tokens. Exchange token via POST for an HttpOnly, Secure, SameSite session cookie; clear token from browser URL immediately. Sensitive actions require additional verification (for example email OTP), and invoice/payment information must not be sent through an unverified bearer link. One-time-use or limited-use links should use Firestore transactions to avoid races.
- Use generic invalid/expired responses, no personal data in URL parameters, no third-party scripts on guest pages, Referrer-Policy: no-referrer, Cache-Control: no-store, strict CSP, CSRF protection and anti-abuse throttles. For emailed links, avoid consuming them on GET because email security scanners prefetch URLs.

## Google Cloud project
Suggested project ID: `afrodizzyacts-dizzyops-prod` (subject to availability). Region: `africa-south1` where supported.
- Static public shell may remain on GitHub Pages temporarily; **never** place OAuth client secrets, service-account keys, admin tokens or protected records there.
- Cloud Run (min instances 0, max instances initially 3, request-based billing, concurrency tuned after measurements) hosts the private API, OIDC callback and guest endpoints.
- Firestore Native mode stores staff authorization, jobs, assignments, follow-ups, guest invitations, audits and lightweight media metadata. Scope every query by authorized job/customer/organization. Use server-generated IDs, security rules/IAM and transactionally enforced state transitions.
- Google Drive Shared Drive holds media and documents. Gmail/Calendar integrations operate server-side with minimum scopes and explicit admin approval. Never use a broad domain-wide delegation grant unless a narrowly scoped, reviewed use case requires it.
- Secret Manager stores client secrets, session-signing keys and token-hash HMAC key. Prefer Workload Identity/attached Cloud Run service identity; no exported service-account JSON keys.
- Cloud Logging and Monitoring track errors, authentication, rate limits, usage and spending without storing client content or raw guest links.

## Data entities (no seed data)
`staff_users`: id, email, role, active, createdAt, lastLoginAt.
`jobs`: id, clientId, eventAt, status, assignedStaffIds, createdAt, updatedAt.
`assignments`: id, jobId, performerId, status, responseAt.
`clients`: id, name, authorizedContacts, consent.
`performers`: id, contact, specialties, complianceStatus.
`follow_ups`: id, jobId, ownerStaffId, nextAction, dueAt, feedbackStatus, mediaStatus.
`guest_links`: id, tokenHmac, jobId, purpose, recipientContactHash, expiresAt, usesRemaining, revokedAt, createdByStaffId.
`media_assets`: id, jobId, driveFileId, uploaderType, rightsStatus, approvedAt.
`audit_events`: id, actorType, actorId, jobId, action, timestamp, outcome.

Never trust client-supplied role, ownership, file ID or price. All authorization and business validation occurs server-side.

## Deployment gates
1. Create Google Cloud project, link billing and configure budget alerts at approximately R250/R500/R650 (billing budgets are **not** hard caps; currency depends on billing account).
2. Confirm the Workspace primary/secondary domain(s), administrator and authorized 14-person staff roster. Select roles: admin, manager, finance, coordinator, viewer. Enforce MFA in Workspace.
3. Configure OAuth consent and confidential web client with exact HTTPS redirect URIs. Set up DNS for `ops.afrodizzyacts.co.za` and API hostname, HTTPS and session-cookie domain strategy. GitHub Pages custom domain is a separate DNS step.
4. Enable Cloud Run, Cloud Build, Artifact Registry, Firestore, Secret Manager, Cloud Logging, IAM, Gmail API, Drive API, Calendar API as needed. Grant service identities only required permissions.
5. Create a dedicated Shared Drive with documented folder and retention policies. Approve OAuth scopes and API access in Google Workspace Admin.
6. Implement backend and end-to-end tests before enabling login or guest-link creation. Test expiry, revocation, token reuse, tenant isolation, unauthorized access, rate limits, CSRF, phishing and file scanning.
7. Enable CI/CD with GitHub OIDC Workload Identity Federation, environment approvals and branch protections; never store long-lived Google credentials in GitHub.
8. Validate POPIA requirements: lawful basis, purpose limitation, data subject rights, retention, audit logs, breach response and cross-border processing.

## Cost controls (initial planning envelope R650/month)
- Cloud Run min instances = 0, max instances = 3; avoid dedicated VMs, Cloud SQL, NAT and always-on load balancers initially.
- Firestore Standard, lean indexes, TTL policies for guest links and logs, bounded pagination, efficient reads.
- Use existing Workspace Drive allocation for media rather than Cloud Storage bulk media.
- Limit logging verbosity and retention, cap upload size, set Cloud Run request timeouts and monitor egress.
- Configure billing budgets and alerts; review real costs after 7, 30 and 90 days. R650 is a **planning target, not a guaranteed cap**; pricing depends on region and usage.

## Current implementation status
This document is an implementation blueprint, **not a deployed backend**. Google Cloud project provisioning, tenant administrator consent, billing, DNS and production secrets are pending. Do not enable any fake sign-in or simulated guest access.

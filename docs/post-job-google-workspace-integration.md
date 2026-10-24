# Post-job follow-up and Google Workspace integration

## Status
The UI is implemented as a **read-only, empty-state module**. No Google tenant, Drive folder, Gmail account, identity provider, database or server-side integration is connected. Do not describe this as a live integration.

## Natalie’s acceptance criteria
For every completed job, create an auditable follow-up with assigned owner and due date. Record client thank-you delivery, client feedback, client photos/videos requested/received, professional media requests, social-media discoveries, and event-manager media requests. Track each request as not requested, requested, awaiting response, received, unavailable, or closed. Store approved media references against the job, not as unstructured uploads. Capture photographer/source, permissions and usage rights before publishing.

## Proposed integration
1. Google Workspace OIDC for sign-in, backend-validated sessions and role-based permissions (admin, operations, manager, performer).
2. Server-side Google Drive API for event-specific folders, uploads and file metadata. Prefer a dedicated Shared Drive, with folder IDs persisted against jobs. Avoid public links by default.
3. Gmail API for templated thank-you and media requests, explicit sender approval and delivery tracking.
4. Google Calendar API for follow-up reminders when approved.
5. Persist jobs, follow-up tasks, status transitions, audit log and Drive file IDs in a secure database. GitHub Pages is static; use an authenticated backend (e.g. Cloud Run) and database (e.g. Cloud SQL or Firestore).
6. Store OAuth secrets in Secret Manager, never in HTML or repository. Use minimum necessary scopes, tenant admin consent where required, and consent-aware media handling aligned with POPIA.
7. Social media discovery should initially capture manually verified URLs; API-based searching requires separate platform permissions and compliance review.

## Deployment gates
- Natalie or an authorised Workspace administrator approves the Google Cloud project, OAuth consent screen, API scopes, service identity and Shared Drive access.
- Configure backend endpoint, authenticated session, RBAC, rate limits, CORS, logging and retention.
- Test account permissions, upload size limits, failed Gmail sends, Drive permission boundaries and mobile UI.
- Enable production write operations only after authorisation and successful integration tests.

No sample records should be seeded.

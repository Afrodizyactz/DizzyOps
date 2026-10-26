# DizzyOps Phase 03 — operator deployment and security acceptance

**Status: code prepared, not provisioned or activated.** The Google Cloud project, billing, DNS, Identity Platform SAML settings, Cloud Run runtime and Firestore database require authorized administrator actions. No billable resources, credentials, IAM changes or live accounts were created from ChatGPT. Current GitHub Pages remains a non-production preview.

## Proposed environment

- Production origin: `https://ops.afrodizzyacts.co.za`; this must be a VERIFIED HTTPS custom domain serving the Cloud Run application, never the public GitHub Pages preview.
- Target: Google Cloud project to be created/selected by AfrodizzyActs, region `africa-south1` Johannesburg for Cloud Run and Firestore (Standard, Native mode).
- Runtime: `dizzyops-api` Cloud Run service, min instances 0, max instances 3, concurrency 20, dedicated `dizzyops-runtime` service account with `roles/datastore.user`.
- Identity: Google Cloud Identity Platform SAML ID `saml.afrodizzyacts`, IdP Google Workspace custom SAML app, explicit allowlist of the 14 approved staff email addresses and roles. **Do not use an IdP URL as the ACS URL.** Use the exact service-provider ACS URL and Entity ID displayed by Identity Platform.
- Auth: verified SAML → Identity Platform ID token → Cloud Run `/auth/session` → secure HttpOnly, SameSite strict signed session cookie. `/auth/me` authorizes the staff role on every private request. Default-deny. No guest accounts.
- Data: `organizations/afrodizzyacts/modules/{slug}/records/{recordId}`; separate `audit` collection per module. No seed data. Server Admin SDK uses project workload identity (ADC) and IAM.
- Finance and Sage remain **out of scope**: old unsynchronised quote/finance editors must not be used for actual transactions. Guest scoped links, Drive content upload, email delivery and reporting aggregation are also not activated by this phase.

## Existing Phase 03 implementation in this branch

`server/business-contract.js`: strict whitelist based on `operations-schema.js`, required fields, status, numeric constraints, text-length caps, calendar/time validation, revision constraints; rejects arbitrary Firestore metadata.

`server/business-policy.js`: management and administrator access to all 10 operational modules; operations role may access operational modules EXCEPT sensitive Documents; finance role has **read-only** access to Bookings, Jobs, Clients; agent is denied until purpose-scoped job grants are implemented. No hard deletion.

`server/business-api.js`: `GET /api/v1/capabilities`, list/read/create/update by module; staff role authorisation on every request; 25-record page limits; bounded search/status; atomic audit writing on create and update; optimistic conflict handling via `expectedRevision` (HTTP 409); CSRF+Origin checks on writes; explicit 405 for delete.

`server/index.js`: route/session gate, Cloud Run runtime Identity Platform client configuration (only PUBLIC web identifiers), `BUSINESS_API_ENABLED` and `IDENTITY_PLATFORM_ENABLED` both default **false**. Unless both are enabled after acceptance checks, business APIs do not activate. GitHub Pages `auth/config.js` stays disabled.

`server/Dockerfile`: built from repository root, includes all scripts and styles. Cloud Build template in `infra/cloudbuild.yaml`.

## Operator sequence

1. Obtain approval and Google Cloud Owner/Billing Admin for the **correct AfrodizzyActs project**. Confirm project ID, linked billing account, local region, POPIA assessment and budget. The target **R650/month is a planning estimate, NOT a platform-enforced spending cap**. Set separate budget alerts, for example R250/R500/R650. Verify Johannesburg Tier 2 Cloud Run/Firestore charges with actual traffic. Set log retention/exclusions and review Firestore storage/reads/writes.
2. Run the included `infra/prepare-cloud.sh` manually only after setting `GOOGLE_CLOUD_PROJECT` and `CONFIRM_BILLABLE_SETUP=YES`. It enables required APIs, prepares Standard Native Firestore with deletion protection, Artifact Registry and a restricted runtime service account. It does **not** attach a billing account, create staff, store secrets, enable Identity Platform provider, create DNS, or deploy the app.
3. Create a `dizzyops-staff-role-map` Secret Manager JSON secret using REAL authorized company accounts (no example or dummy users). Grant Secret Manager Secret Accessor to `dizzyops-runtime` **on that secret only**. Keep roles minimal, verify email casing and approved staff list. Create a dedicated build/deploy principal with Artifact Registry, Cloud Run deployment, Cloud Build and `iam.serviceAccountUser` rights; no JSON service account keys or secrets in GitHub.
4. Complete Identity Platform setup under the same Google Cloud/Firebase project. Add SAML provider `saml.afrodizzyacts` using the verified Google Workspace IdP entity, SSO URL and current public signing certificate. Copy the **actual** ACS URL/Entity ID from Identity Platform into the Workspace custom SAML app, assign only 14 approved staff accounts, enable the app in Workspace after validation. Register `ops.afrodizzyacts.co.za` as an authorized Firebase authentication domain. Record approved public Firebase web app `apiKey`, `appId`, `authDomain` (these are identifiers, NOT Admin SDK secrets). Configure domain mapping through a supported product such as external HTTPS load balancer or Hosting rewrite; do not assume direct Cloud Run mapping in Johannesburg without checking support.
5. Apply Firestore restrictive rules (`firestore.rules`) to the project to block all direct Firebase client reads/writes; deploy indexes from `firestore.indexes.json`. Check collection scope and wait for index readiness. Firestore Admin SDK bypasses client rules, so Cloud Run IAM permissions and API authorization are mandatory.
6. Build image from repository root, with **immutable tag**: `gcloud builds submit . --project "$GOOGLE_CLOUD_PROJECT" --config infra/cloudbuild.yaml --substitutions _REGION=africa-south1,_IMAGE_TAG="$IMAGE_TAG"`. Set `IMAGE_TAG` to an approved commit SHA. This build requires a correctly configured Cloud Build principal and Artifact Registry writer permissions.
7. Set verified `PUBLIC_ORIGIN`, public Firebase IDs and `IMAGE_TAG`, then run `infra/deploy-cloud-run.sh` manually with `CONFIRM_BILLABLE_SETUP=YES`, flags `IDENTITY_PLATFORM_ENABLED=false` and `BUSINESS_API_ENABLED=false` on the first deploy. The Cloud Run HTTPS login landing page should render, while all data endpoints remain protected.
8. Verify SAML with a real allowlisted test staff account on the approved domain. Confirm bad passwords, unassigned accounts, malformed/expired tokens and expired sessions do NOT grant access. Once the Identity Platform handshake, secret map, CSRF and return URI checks pass, deploy with `IDENTITY_PLATFORM_ENABLED=true`; then test verified staff login.
9. Turn on `BUSINESS_API_ENABLED=true` only after Firestore IAM/indexes, policies, audits and deployment reviews pass. Verify create → list → edit → reload in two separate staff browser sessions; simultaneous editing should return HTTP 409. Check role denial for finance, agent, restricted Docs; no records should be inserted automatically. Verify offline/permission failures do not claim saved data.
10. Configure monitoring and backups: billing alerts, Cloud Monitoring uptime/errors, audit log retention, Firestore backups/PITR if approved, incident response, POPIA data rights, private support access and least-privilege periodic review.

## Never activate until accepted

- No bypass of Google Workspace SAML/session cookie validation, no wildcard staff authorization, no guest direct API access, no production secrets in repo.
- Demonstrate that public GitHub Pages has zero real data access and all sensitive routes reject anonymous callers.
- Ensure Cloud Run and Firestore belong to AfrodizzyActs, with account and financial authority approved by Natalie.
- Confirm real operational records can be created, accessed, updated and reloaded ONLY by approved role-authorized staff after permission checks. End-to-end tests must be performed on actual provisioned infrastructure before calling the portal production-ready.
- Additional scope: full record-level job assignments and secure external links, financial system-of-record mapping, Drive uploads, and report aggregation are independent follow-up delivery items.

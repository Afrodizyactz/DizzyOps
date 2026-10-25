# DizzyOps — Production Architecture

> **Architecture blueprint · Not yet deployed**  
> **Identity:** 14 existing Google Workspace staff · **Guests:** secure, scoped, expiring links  
> **Cloud:** Google Cloud / `africa-south1` where available · **Planning envelope:** R650/month (not a hard cap)

## 1. Architecture at a glance

```mermaid
flowchart TB
  S[👥 14 authorized staff] -->|Google OIDC + PKCE| UI[🖥️ Staff portal]
  G[🎭 Performers / clients / event managers] -->|Expiring action link| GP[🔗 Isolated guest page]
  UI --> API[🔐 Cloud Run private API]
  GP -->|POST token exchange → secure cookie| API
  API --> AUTH[🛡️ Allowlist + RBAC + job scope]
  API --> DB[(🗃️ Firestore Native)]
  API --> DRIVE[📁 Google Shared Drive]
  API --> WS[✉️ Gmail / 📅 Calendar APIs]
  API --> SECRETS[🔑 Secret Manager]
  API --> OBS[📈 Cloud Logging / Monitoring]
  classDef boundary fill:#e8f1ff,stroke:#2563eb,color:#102a43
  classDef store fill:#e7f8ee,stroke:#15803d,color:#123b24
  classDef guard fill:#fff1d6,stroke:#d97706,color:#593400
  class UI,GP,API boundary
  class DB,DRIVE,WS,SECRETS,OBS store
  class AUTH guard
```

**Trust boundary:** GitHub Pages may host only a public static shell. Authentication, authorization, protected records, and all sensitive actions live on the Cloud Run backend.

## 2. Two distinct access paths

| | 🧑‍💼 Staff | 🎟️ Guest |
|---|---|---|
| Identity | Existing Google Workspace account | **No persistent account** |
| Entry | Google OIDC authorization code + PKCE | 256-bit CSPRNG token in a purpose-specific link |
| Authorization | Verified identity **plus** explicit allowlist and RBAC | Token purpose, job scope, recipient checks and remaining uses |
| Session | Secure backend session | POST exchange to HttpOnly / Secure / SameSite cookie |
| Visibility | Authorized staff functions and jobs | **One action on one job only** |
| Expiry | Session policy | Short TTL; revocable; one-time or limited-use |

### Staff sign-in sequence

```mermaid
sequenceDiagram
  actor Staff
  participant Portal
  participant API as Cloud Run
  participant Google as Google OIDC
  participant DB as Firestore
  Staff->>Portal: Open staff portal
  Portal->>API: Start authorization-code + PKCE
  API->>Google: Redirect with state and nonce
  Google-->>API: Authorization code
  API->>Google: Exchange code securely
  Google-->>API: ID token
  API->>API: Validate issuer, audience, nonce, hosted domain, verified email
  API->>DB: Check active allowlist + role
  alt Authorized
    API-->>Staff: Secure session cookie
  else Unauthorized
    API-->>Staff: Access denied
  end
```

> **Important:** Membership in the Workspace domain does **not** grant portal access. Enforce MFA in Workspace; never trust roles or ownership supplied by the browser.

### Guest link lifecycle

```mermaid
flowchart LR
  A[Staff selects one action] --> B[Generate 256-bit random token]
  B --> C[Store keyed token HMAC + purpose + job + expiry + usage limit]
  C --> D[Deliver expiring link]
  D --> E[Guest opens isolated page]
  E --> F[POST token exchange]
  F --> G{Valid, scoped, unused, not revoked?}
  G -->|Yes| H[Set secure cookie; clear URL token]
  G -->|No| X[Generic invalid/expired response]
  H --> I{Sensitive action?}
  I -->|Yes| J[Additional verification e.g. email OTP]
  I -->|No| K[Perform authorized action]
  J --> K
  K --> L[Transactionally decrement uses + audit]
  classDef deny fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d
  class X deny
```

**Allowed guest actions:** confirm a job · submit availability · provide feedback · approve a quote · upload media · review an invoice (only with appropriate additional verification).

**Anti-abuse controls:** Never consume links on GET (mail scanners prefetch). Do not log raw tokens, include personal data in URLs, expose third-party scripts on guest pages, or deliver invoice/payment details via unverified bearer links. Use `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, strict CSP, CSRF defenses, throttling, and transactional one-time-use enforcement.

## 3. Data model and relationships

```mermaid
erDiagram
  STAFF_USERS ||--o{ JOBS : assigned_to
  CLIENTS ||--o{ JOBS : commissions
  JOBS ||--o{ ASSIGNMENTS : has
  PERFORMERS ||--o{ ASSIGNMENTS : accepts
  JOBS ||--o{ FOLLOW_UPS : requires
  STAFF_USERS ||--o{ FOLLOW_UPS : owns
  JOBS ||--o{ GUEST_LINKS : scopes
  JOBS ||--o{ MEDIA_ASSETS : contains
  JOBS ||--o{ AUDIT_EVENTS : records
  STAFF_USERS ||--o{ GUEST_LINKS : creates
```

| Collection | Core fields |
|---|---|
| `staff_users` | id, email, role, active, createdAt, lastLoginAt |
| `jobs` | id, clientId, eventAt, status, assignedStaffIds, createdAt, updatedAt |
| `assignments` | id, jobId, performerId, status, responseAt |
| `clients` | id, name, authorizedContacts, consent |
| `performers` | id, contact, specialties, complianceStatus |
| `follow_ups` | id, jobId, ownerStaffId, nextAction, dueAt, feedbackStatus, mediaStatus |
| `guest_links` | id, tokenHmac, jobId, purpose, recipientContactHash, expiresAt, usesRemaining, revokedAt, createdByStaffId |
| `media_assets` | id, jobId, driveFileId, uploaderType, rightsStatus, approvedAt |
| `audit_events` | id, actorType, actorId, jobId, action, timestamp, outcome |

*No seed data.* Generate IDs server-side; scope every query by authorized job/customer/organization. Enforce state transitions in transactions and validate file IDs, prices, and permissions on the server.

## 4. Infrastructure and security layers

```mermaid
flowchart TB
  DNS[🌐 DNS + HTTPS: ops.afrodizzyacts.co.za / API hostname] --> WEB[Public static shell / staff web UI]
  WEB --> RUN[Cloud Run: API + OIDC callback + guest endpoints]
  RUN --> FIRE[(Firestore Standard / Native mode)]
  RUN --> SM[Secret Manager: OAuth secret, session key, token HMAC key]
  RUN --> ID[Attached service identity / least-privilege IAM]
  ID --> DRIVE[Shared Drive: documents and media]
  ID --> GC[Approved Gmail + Calendar scopes]
  RUN --> LOG[Logging, Monitoring, budget alerts]
  CICD[GitHub CI/CD + OIDC Workload Identity Federation] -->|Protected deploy| RUN
```

**Never deploy:** service-account JSON keys, OAuth client secrets, admin tokens, or protected records to GitHub Pages or GitHub secrets when short-lived federation is available. Avoid broad domain-wide delegation unless specifically reviewed and justified.

## 5. Deployment gates

```mermaid
flowchart LR
  P1[1 · Foundation\nProject + billing + budgets] --> P2[2 · Identity\nDomains + 14-person roster + MFA + RBAC]
  P2 --> P3[3 · Connectivity\nDNS + HTTPS + OAuth redirect URIs]
  P3 --> P4[4 · Services\nAPIs + IAM + Shared Drive + secrets]
  P4 --> P5[5 · Build & verify\nBackend + E2E security tests]
  P5 --> P6[6 · Release\nCI/CD approvals + monitoring + POPIA]
```

**Suggested project ID:** `afrodizzyacts-dizzyops-prod` (availability unconfirmed). Configure Cloud Run, Cloud Build, Artifact Registry, Firestore, Secret Manager, Cloud Logging, IAM, and only the Google APIs required. Configure Workspace Admin approval for OAuth scopes and API access. Define Shared Drive folders and retention. GitHub Pages custom-domain DNS is a separate step.

**Release-blocking tests:** expiry · revocation · reuse/race conditions · tenant/job isolation · unauthorized access · rate limits · CSRF · phishing resilience · upload/file scanning · auditable state transitions.

**POPIA review:** lawful basis · purpose limitation · data-subject rights · retention · breach response · auditability · cross-border processing.

## 6. Cost-control dashboard

| Lever | Initial setting / policy |
|---|---|
| Cloud Run | Min instances **0**, max **3**, request-based billing; tune concurrency from measurements |
| Database | Firestore Standard; lean indexes, bounded pagination, efficient reads, TTL cleanup |
| Media | Existing Workspace Shared Drive capacity, rather than bulk Cloud Storage |
| Avoid initially | Dedicated VMs, Cloud SQL, NAT, always-on load balancers |
| Operational limits | Capped upload sizes, request timeouts, controlled logs/retention and egress monitoring |

```mermaid
flowchart LR
  B1[🟢 ~R250 alert] --> B2[🟠 ~R500 alert] --> B3[🔴 ~R650 alert]
  B3 --> R[Review usage and adjust controls]
```

**R650/month is a planning envelope, not a spending limit.** Billing alerts do not stop charges; currency depends on the billing account. Review actual costs at **7, 30, and 90 days**.

## 7. Readiness snapshot

| Area | Status |
|---|---|
| Architecture and access design | 🟦 Blueprint documented |
| Google Cloud project and billing | ⬜ Pending |
| Workspace admin consent and staff roster | ⬜ Pending |
| DNS, production secrets and service identities | ⬜ Pending |
| Backend implementation and security testing | ⬜ Pending |
| Production rollout | ⛔ Not deployed |

> **Release rule:** Do not enable fake sign-in, simulated guest access, or production guest-link creation before the real backend, identity checks, and deployment gates are complete.

---

*Diagram rendering: GitHub supports Mermaid diagrams in Markdown. If a viewer does not support Mermaid, the accompanying tables and prose preserve the architecture.*

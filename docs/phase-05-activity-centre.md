# Phase 05 — Staff Task & Activity Centre

## Implemented

- `#tasks`: dedicated SaaS page for verified staff tasks, status filters, team inbox for management, secure create form and optimistic status changes.
- `#mywork`: a staff task summary (up to five genuine records), with a route into the Task Centre. Preview always displays the unconnected state.
- Existing bookings, jobs, clients, inventory and post-job follow-ups can act as linked **real** record references; a task cannot be created until the linked Firestore document exists.
- Assignment recipients are restricted to an explicitly approved staff allowlist. Management/admin may assign to any eligible approved staff. Operations may self-assign; finance may view/change only their own tasks; agents cannot use this internal task API.
- Firestore stores tasks in `organizations/afrodizzyacts/tasks` and separate append-only `taskAudit` entries. Writes require verified server session, Origin and CSRF validation. Updates use `expectedRevision`; conflicting changes return HTTP 409. No hard delete.
- Search scope: filtered paginated inbox, no general search over performer/client data. Page size limited to 25. Staff directory endpoint is restricted to management/admin.
- `ACTIVITY_API_ENABLED=false` defaults off and requires the Phase 03 SAML, Firestore and business API flags active before writes can happen.

## Verification checklist

1. Confirm `node --test server/test/activity-contract.test.js`, `node --test test/activity-centre.test.cjs`, and existing CI checks pass.
2. In public preview, `#tasks` and My Work show *zero tasks* and no persistence, backend calls, or fake counters.
3. Once an approved Cloud Run deployment is activated, signed-in staff can list **only their own** assigned tasks; management can select Team.
4. Creating a task without a real linked business record must fail. Invalid recipient, unauthorized module, unapproved staff, extra fields, or invalid dates must fail on server.
5. Cross-user edits, agent access, anonymous requests, invalid CSRF/Origin, and stale revision writes must be rejected. Verify that audit entries accompany every accepted mutation.
6. Check the task page at mobile 320px and desktop widths, keyboards and screen readers. Ensure status feedback is accurate on write failure and success.
7. Deploy and verify Firestore indexes in production before enabling `ACTIVITY_API_ENABLED=true`.

## Explicitly out of scope

Automatic job-triggered tasks, notification delivery, time-based reminders, live push activity, email/calendar dispatch, and performer/customer guest access are NOT implemented. These require separate queueing, notification controls, secure action links, and acceptance testing. No customer data or sample tasks are added in this phase.

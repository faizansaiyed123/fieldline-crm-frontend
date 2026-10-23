# Fieldline CRM — Feature Coverage Matrix

This is the companion inventory for the [Product Walkthrough](PRODUCT-WALKTHROUGH.md). It distinguishes browser flows backed by the migrated PostgreSQL test database, direct API read-back assertions, and UI-only tests that deliberately use fixtures.

## Real PostgreSQL-backed browser coverage

The full workflow is invoked by the Frontend + Backend E2E action. It starts PostgreSQL 18, installs and starts the backend, applies Alembic migrations, builds the frontend, and runs Playwright against that running application. The current journey is split between:

- e2e/real-backend.spec.ts — workspace creation and baseline contact flow.
- e2e/deep-product.spec.ts — customer journey, linked records, engagement, saved-view execution, imports and core workspace screens.
- e2e/full-feature-coverage.spec.ts — lifecycle, archive, pagination, pipeline transitions, automation, merge, rules, sessions and import validation/read-back.
- e2e/standout.spec.ts and e2e/smoke.spec.ts — supplemental UI behavior checks; fixture-backed cases are called out below.

| Feature | Assertions exercised against the real backend | Browser evidence |
| --- | --- | --- |
| Signup and workspace initialization | Signup response, identity/membership, dashboard totals | Dashboard and auth/session walkthrough images |
| Login/session lifecycle | Wrong password rejected; correct password works; workspace remains authenticated after reload; refresh cookies are exercised | Auth/session screenshot |
| Health and readiness | GET health and ready; database readiness result verified | System-health screenshot and CI logs |
| Organization access | Membership and owner/admin access read; anonymous organization access rejected | Full-feature API assertions |
| Companies | Create, search, get detail, edit, reload, archive and verify 404; multi-page directory navigation | Record management and company pagination screenshots |
| Contacts | Create with company link, search, get detail, update fields/lifecycle, archive and verify 404; multi-page contacts navigation | Record management and contact pagination screenshots |
| Contact relationship services | Relationship-health score response, contact timeline response and relationship graph nodes/edges | Relationship-context and quality-merge screenshots |
| Pipeline stages | Read defaults; create a custom open stage; reject duplicate stage name | Pipeline/API assertions |
| Opportunities | Create, link contact/company, update expected close date, read detail; transition to Won and Lost; require lost reason; archive and verify 404; multi-page list | Pipeline, pipeline-outcomes and opportunity-pagination screenshots |
| Activities | Create activity; verify it in contact context and after a contact merge via the activity list | Relationship context and quality merge |
| Tasks | Create follow-up/overdue task, read list, complete task, and verify completed state; verify automation-created tasks | Planner-task and automation-execution screenshots |
| Attention and planner | Read attention/dashboard information, surface overdue work, verify reason/next-action and completion refresh; read pipeline/stuck response | Dashboard, planner and pipeline screenshots |
| Automation | Create Won/Lost rules; toggle rule enabled state; trigger on actual opportunity transitions; read run list/detail and resulting tasks | Automation-rule and automation-execution screenshots |
| Data quality and merge | Find duplicate contacts and similar company names; merge both record types; check old IDs disappear and linked activity/task/opportunity/company references transfer | Quality-merge screenshot |
| Business rules and system diagnostics | Read rules, save a valid threshold, reject an out-of-range threshold, reload saved value; check DB, migration and pg_trgm status | Rules/system-health screenshot |
| Saved-view lifecycle | Create shared view, detail and execute, edit filters/sort/name, verify definition version advances, delete and verify empty list | Saved-view-lifecycle screenshot |
| Contact imports | Invalid email and duplicate email preview; disabled commit for invalid input; valid preview, dry-run, commit, job read-back and contact-list read-back | Import-validation and import-readback screenshots |
| UI route traversal | Open dashboard, companies, contacts, pipeline, planner, data quality, relationship map, automation, settings, saved views and imports | Product walkthrough images |

## API route inventory

These backend route groups are mounted under the configured API prefix. The browser suite directly calls selected endpoints to verify persisted responses; route-specific contract, authorization, validation and security cases also run in backend pytest.

| Backend route group | Covered behavior |
| --- | --- |
| Auth: signup, login, refresh, logout, me | Signup/login, invalid login, logout, reload/refresh, identity response; security and rate-limit cases in backend regression tests |
| Health: health, ready | Service and database readiness |
| Organizations: membership, admin-access | Membership role and admin permission checks |
| Companies | Create, list, detail, update, archive |
| Contacts | Create, list, detail, update, archive |
| Pipeline: stages | List stages, create stage, reject duplicate |
| Opportunities | Create, list with filters, detail, update stage/status/date, archive |
| Engagement: activities and tasks | Create/list activities and tasks, complete tasks through PATCH |
| Attention | Dashboard attention queue and threshold-sensitive signals |
| Relationship health, timeline | Read relationship-health and contact timeline |
| Standout: data-quality and merge | Duplicate report, contact merge, company merge |
| Standout: work-planner and pipeline/stuck | Work planning and stuck-opportunity diagnostics |
| Standout: relationship graph | Graph nodes/edges and transferred links after merge |
| Standout: business-rules and system-health | Valid/invalid threshold updates and operational checks |
| Automation: rules and runs | Rule creation/toggle, execution list and execution detail after Won/Lost transitions |
| Saved views | List, create, get, update/version, execute, delete |
| Imports | Preview, get job, dry-run, commit, invalid/duplicate handling and read-back |

## Backend regression/security coverage

The Backend CI workflow runs linting and compilation, applies migrations, executes the complete pytest suite against its PostgreSQL service, and builds the backend container. It also collects statement and branch coverage for the backend application and publishes an HTML coverage report as a downloadable workflow artifact. In addition to the browser flows, the backend suite includes dedicated test modules for:

- Authentication, session/CSRF behavior, password/session security and rate limits.
- Authorization and organization/tenant scoping.
- Company, contact, opportunity and pipeline validation.
- CSV import validation, duplicates and atomic commit behavior.
- Activity/task/audit data, timeline, relationship health and merge transfer behavior.
- Saved-view definitions, automation idempotency/history, business rules, attention/planner, data-quality logic, relationship graph and system health.
- HTTP hardening, configuration and application readiness.

The added `tests/test_payload_boundaries.py` integration suite exercises selected schema and query boundaries using PostgreSQL-backed requests: accepted minimum/maximum company and contact lengths; rejection of blank or overlong names, malformed website/email inputs, unsupported lifecycle values and oversized optional fields; and rejection of invalid page/page-size/search query parameters. It also verifies that invalid company/contact create requests do not leave records behind.

Coverage output is currently diagnostic: there is no arbitrary minimum percentage enforced yet. This makes uncovered statements and branches visible for prioritizing the next set of tests, while avoiding a made-up threshold before the baseline has been reviewed. A coverage percentage by itself is not proof that assertions are meaningful or that every input combination has been tested.

The CI pass confirms the repository tests passed for the recorded backend commit. It does not mean production customer data or a deployed production database was exercised.

## Fixture-backed UI tests — not counted as database evidence

The following UI checks intentionally intercept requests to produce deterministic states: narrow-viewport overflow checks, keyboard-reachable contact inspection, parallel expired-token refresh behavior, loading/retry error presentation, and selected spotlight UI scenarios. They are useful client-side checks, but their mocked responses do not count as real API/database workflow coverage.

## Interpreting the word “all”

The matrix maps the shipped user-facing workflows and mounted API route groups to explicit browser or backend regression checks. It is not a claim that every internal code branch, every possible payload permutation, every permission combination, or production deployment configuration has been exhaustively proven. The live database used for these tests is an isolated CI PostgreSQL database with synthetic test records, not the production database.

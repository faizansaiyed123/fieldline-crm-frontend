# Fieldline CRM — Product Walkthrough

Fieldline CRM brings customer records, sales opportunities, relationship context, follow-through, data quality, and operational automation into one connected workspace. The screens below are captured from browser-driven workflows against the companion FastAPI service and an isolated PostgreSQL database.

## The product at a glance

A typical workspace journey moves from creating a company and linking a contact, through an opportunity and saved customer view, to importing another contact and reviewing work, data quality, relationships, and automation.

~~~mermaid
flowchart LR
    U[CRM user] --> UI[Next.js workspace]
    UI --> API[FastAPI API]
    API --> V[Validation, authorization and business rules]
    V --> DB[(PostgreSQL)]
    DB --> V
    V --> API
    API --> UI
~~~

The browser workflow uses normal forms and navigation. The UI sends requests to the backend, the backend validates and applies the operation, PostgreSQL stores the result, and subsequent views retrieve the saved state from the API.

## Workspace and customer records

### 1. Dashboard

![Fieldline CRM dashboard](visuals/01-dashboard.png)

The overview brings contact, company, pipeline, and attention signals into a single operating view.

### 2. Companies

![Company workspace](visuals/02-companies.png)

Create a company, update its details, then reload the workspace and confirm that the revised name is returned again by the service. This checks persistence beyond the open edit form.

### 3. Contacts

![Contact workspace](visuals/03-contacts.png)

A contact is saved with its lifecycle, email, and company relationship. The table reflects the saved record after the create request completes.

### 4. Relationship context

![Contact relationship context](visuals/04-relationship-context.png)

The contact detail view combines a relationship-health signal with recent activity and task context. The walkthrough records an activity and creates a follow-up task through the real API, then reads their updated context back into this panel.

## Pipeline and reusable customer slices

### 5. Pipeline

![Opportunity pipeline](visuals/05-pipeline.png)

An opportunity is created with an amount, linked company/contact, and expected close date. The flow edits the saved opportunity and verifies its updated value in the detail form.

### 6. Saved views

![Saved contacts view](visuals/06-saved-views.png)

A named view stores a reusable contact query. Selecting it runs the saved definition against the API and displays the matching records, rather than just showing a local-only filter.

### 7. Import

![Contact import](visuals/07-imports.png)

The contact import flow validates a CSV, runs a dry run, and commits the accepted row. The UI reports the result of the backend import operation.

### 8. Import read-back

![Imported contact in the contact workspace](visuals/08-contact-after-import.png)

After the import completes, the contact list is opened again and the newly imported contact is found through the normal list endpoint. This is a second-screen read-back of the import.

## Operational intelligence and administration

### 9. Planner

![Daily work planner](visuals/09-planner.png)

The planner turns CRM state into a prioritized queue of suggested work, with reasons and next actions shown alongside the priority.

### 10. Data quality

![Data quality center](visuals/10-data-quality.png)

The quality workspace summarizes duplicates and other actionable data issues so that records can be reviewed before downstream work is affected.

### 11. Relationship map

![Relationship map](visuals/11-relationships.png)

Selecting a contact loads the backend relationship graph and renders the linked entities. The screenshot shows a graph built from saved workspace relationships.

### 12. Automation

![Automation rules](visuals/12-automation.png)

An automation rule is created and then shown in the rule list. The rule configuration is stored by the service so it can be managed as part of the workspace.

### 13. Settings

![Workspace settings and system health](visuals/13-settings.png)

The settings view brings workspace-level configuration and system-health information together.


## Record management and full feature coverage

### 14. Record management

![Record management](visuals/14-record-management.png)

The record-management journey searches and edits a company and contact, checks the contact, company, and relationship endpoints, then archives the records and confirms that archived details are no longer returned.

### 15. Company directory pagination

![Company directory pagination](visuals/15-company-pagination.png)

The company directory is populated with more records than fit on one page. Moving forward and back verifies that the list controls navigate the API-backed result set.

### 16. Contact directory pagination

![Contact directory pagination](visuals/16-contact-pagination.png)

The contacts directory exercises both pages of a multi-page result, including returning to the first page.

### 17. Authentication and session recovery

![Authentication and session recovery](visuals/17-auth-session.png)

The journey signs out, verifies that an incorrect password is rejected, signs in with the correct credentials, and reloads the workspace to exercise refresh-session recovery.

### 18. Won, lost, and archived pipeline outcomes

![Pipeline outcomes](visuals/18-pipeline-outcomes.png)

Separate opportunities are moved into Closed Won and Closed Lost. The lost transition requires a reason, won/lost counts are checked, and an archived opportunity is confirmed absent from the normal list and detail API.

### 19. Opportunity directory pagination

![Opportunity directory pagination](visuals/19-opportunity-pagination.png)

The pipeline is populated beyond one page, and Next/Previous navigation is checked against the API-backed opportunity list.

### 20. Automation execution history

![Automation execution history](visuals/20-automation-execution.png)

The two pipeline outcomes trigger separate configured rules. The resulting run records are read back from the backend, and their generated follow-up tasks are checked independently.

### 21. Planner task completion

![Planner task completion](visuals/21-planner-task.png)

An overdue task enters the planner with its reason and next action. Completing it removes the item from the active work queue and the task API confirms the completed state.

### 22. Operating rules and system health

![Operating rules and system health](visuals/22-rules-system-health.png)

An operating threshold is changed, checked through the API, then confirmed after reload. An invalid threshold is rejected, while the health endpoint reports database connectivity, migration state, and the fuzzy-matching extension.

### 23. Duplicate resolution with relationship preservation

![Data-quality merge](visuals/23-quality-merge.png)

The data-quality workspace identifies duplicate contacts and similar company records. Merging each pair keeps the survivor, retires the duplicate, and verifies that activities, tasks, opportunities, and contact-to-company links still point to the surviving records.

### 24. Saved-view lifecycle

![Saved-view lifecycle](visuals/24-saved-view-lifecycle.png)

A shared saved view is created and executed, its definition is edited, the version number advances, and its sorting and sharing settings are read back from the API before the view is deleted.

### 25. Import validation and duplicate protection

![Import validation](visuals/25-import-validation.png)

An invalid email and a duplicate organization email are both rejected during preview. The UI prevents committing invalid rows, leaving existing contact data unchanged.

### 26. Import commit and read-back

![Import commit and read-back](visuals/26-import-readback.png)

A valid CSV is previewed and dry-run, committed, and verified through both the persisted import-job record and the ordinary contacts endpoint.

## A persistence example

The walkthrough includes create, read, update, and archive lifecycles; server-side search and page navigation; valid and invalid authentication; relationship and timeline reads; Won/Lost stage transitions and their resulting automation runs; task completion; saved-view versioning, execution, sharing and deletion; import validation, dry-run rollback and commit; and contact/company merge operations with relationship-transfer checks.

The database-backed browser suite issues normal UI requests and direct API reads through the frontend proxy into the FastAPI service. It verifies the persisted result after the write rather than treating a success message alone as proof of persistence. The full API/security regression suite is run separately by the backend CI workflow against PostgreSQL. Some UI-only resilience checks deliberately use controlled fixtures for transient errors, refresh concurrency, viewport bounds and keyboard interaction; those checks are not represented as real-database evidence in these screenshots.

These screenshots are captured in an isolated PostgreSQL-backed integration workspace using synthetic example records; they are not production customer data. The workflow runs Alembic migrations and starts the backend against PostgreSQL before exercising the browser.

## Feature map

| Area | User-facing action | Backend and persistence evidence |
| --- | --- | --- |
| Authentication | Sign up, sign out, reject an incorrect password, sign in again and reload | Account and session APIs, refresh-cookie recovery and user identity read-back |
| Dashboard and health | Review totals, retry errors and check readiness | Contacts, companies, opportunities, attention, /health, /ready and system-health routes |
| Companies | Create, search, read details, edit, archive and paginate | Company create/list/get/update/archive operations and active-record filtering |
| Contacts | Create, search, link a company, edit lifecycle/details, archive and paginate | Contact create/list/get/update/archive operations; relationship-health and timeline reads |
| Pipeline stages | List and create a custom stage; reject duplicate stage names | Pipeline stage list/create, validation and uniqueness handling |
| Opportunities | Create and link records, update the close date, mark Won or Lost with a reason, archive and paginate | Opportunity create/list/get/update/archive; stage-derived status and summary counts |
| Relationship context | Record activity, create a task and inspect connected entities | Activity/task writes, audit records, relationship health, timeline and graph reads |
| Planner | Surface overdue work and complete a task | Work-planner, attention queue and task PATCH read-back |
| Data quality | Detect duplicates and merge contacts/companies | Duplicate candidates, merge operations, audit records and transferred relationship IDs |
| Saved views | Create, share, execute, edit, re-sort, version and delete a view | Saved-view GET/POST/PATCH/DELETE/execute and version read-back |
| Imports | Preview invalid/duplicate/valid CSVs, dry-run and commit | Import preview/job/commit APIs, duplicate validation, completed-job status and imported-contact read-back |
| Automation | Create/toggle rules, transition opportunities and inspect execution history | Rule list/create/update, won/lost trigger processing, run list/detail and resulting task persistence |
| Operating rules | Update valid thresholds and reject out-of-range values | Business-rule GET/PATCH, invalid-value response, planner/attention threshold updates |
| Responsive and recovery behavior | Open detail panels, inspect keyboard behavior, use a narrow viewport and recover from controlled errors | Separate UI-focused Playwright tests; intentionally mocked cases are identified in the coverage matrix |

The implementation and coverage matrix are documented in [FEATURE-COVERAGE.md](FEATURE-COVERAGE.md), including routes that are API-only and the additional backend security/regression tests.

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

## A persistence example

The walkthrough follows several write/read-back sequences:

1. A company is created and renamed. After the company drawer closes, the page is reloaded and the new name is checked in the company table.
2. A contact is created and connected to that company. An activity and follow-up task are saved from the contact detail panel, then shown in its recent context.
3. An opportunity is attached to the same company and contact. The expected close date is updated and checked again after saving.
4. A saved view is created and executed. Its result count is based on the matching stored contact record.
5. A CSV import passes validation, completes a dry run, and is committed. The imported contact is then retrieved from the regular Contacts screen.

These screenshots are captured in an isolated PostgreSQL-backed integration workspace using synthetic example records; they are not production customer data. The workflow runs Alembic migrations and starts the backend against PostgreSQL before exercising the browser, so the core journey is not fulfilled by mocked API responses.

## Feature map

| Area | Main action shown | Connected service behavior |
| --- | --- | --- |
| Dashboard | Review workspace totals | Reads company, contact, opportunity, and attention summaries |
| Companies | Create, edit, reload | Stores and returns company fields |
| Contacts | Create and link a contact | Stores contact fields and company relationship |
| Relationship context | Record activity and task | Writes engagement records and refreshes context |
| Pipeline | Create and update an opportunity | Stores amount, links, stage, and expected close date |
| Saved views | Save and execute a contact query | Persists a view definition and returns matching records |
| Imports | Validate, dry run, commit | Applies the CSV import and reports committed rows |
| Planner | Inspect prioritized work | Builds a work plan from workspace records |
| Data quality | Review issue summary | Retrieves duplicate and quality findings |
| Relationships | Select a contact | Reads its connected relationship graph |
| Automation | Create a rule | Persists an automation definition |
| Settings | Inspect configuration | Reads workspace settings and system health |

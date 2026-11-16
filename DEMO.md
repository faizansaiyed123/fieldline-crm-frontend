# Fieldline CRM browser demo

This branch contains a recruiter-safe synthetic demo environment. The frontend opens in **browser-demo mode by default** and does not need a deployed backend, database, Redis, or external account.

## Start the frontend

    npm ci
    npm run dev

Open http://127.0.0.1:3000 and choose Sign in.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | alex@fieldline.demo | Demo1234! |
| Member | jordan@fieldline.demo | Demo1234! |

The owner account can manage automation, saved views, imports, and operating rules. The member account demonstrates restricted access.

## What works in browser-demo mode

The simulator seeds example companies, contacts, opportunities and pipeline stages, overdue tasks, activity, saved views, automation rules, and data-quality findings. It supports create/update/archive operations for core CRM records, contact relationship context and graph, follow-up activities/tasks, planner completion, saved-view lifecycle and execution, deterministic won/lost automation runs, CSV preview/dry-run/commit, and operating-rule changes.

Changes persist in that browser's local storage. The Reset demo data control restores the synthetic seed while keeping the current signed-in account. Clearing site data also resets the demo.

The banner and system-health screen identify this as a local simulation. It does not send real email, execute external webhooks, charge payments, connect to customer data, or claim a live database is healthy.

## Optional local API simulator

A standalone FastAPI demo API is available in the companion fieldline-crm-backend repository's demo branch. It runs separately and uses in-memory synthetic records only.

To use that API instead of the browser simulator, start the backend demo server (see its DEMO.md) and create .env.local:

    NEXT_PUBLIC_FIELDLINE_DEMO=false
    BACKEND_URL=http://127.0.0.1:8001

Then restart the frontend. Do not use browser-demo mode as a substitute for production authentication or persistence.

## Demo CI

The Fieldline Frontend Demo Checks workflow runs only for pushes to this demo branch or manual dispatch. It checks TypeScript, builds the application, runs the dedicated browser-demo Playwright tests, and builds the frontend Docker image. The existing main-branch CI and real-PostgreSQL E2E workflow are not modified.

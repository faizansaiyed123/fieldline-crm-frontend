# Fieldline CRM Frontend

Web application for **Fieldline CRM**.

Fieldline is a focused CRM workspace for customer relationships, sales pipeline execution, explainable operational intelligence, data quality, and follow-through.

## Stack

- Next.js 16
- React 19
- TypeScript
- TanStack React Query
- Playwright

## Local setup

Install dependencies:

\`\`\`bash
npm install
\`\`\`

Create `.env.local` from `.env.example`:

\`\`\`text
BACKEND_URL=http://127.0.0.1:8000
\`\`\`

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

The browser app runs on `http://127.0.0.1:3000`.

The frontend calls `/api/v1/*` and Next.js rewrites those requests to `BACKEND_URL`. This keeps browser API calls same-origin and lets the backend continue to own authentication cookies and CSRF validation.

## Checks

\`\`\`bash
npm run typecheck
npm run build
npm run e2e
\`\`\`

## Backend

The companion API lives in [fieldline-crm-backend](https://github.com/faizansaiyed123/fieldline-crm-backend).

For real-backend browser verification, the E2E workflow starts PostgreSQL and the companion backend before running the frontend tests.

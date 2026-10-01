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

```bash
npm install
```

Create `.env.local` from `.env.example`:

```text
BACKEND_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

The browser app runs on `http://127.0.0.1:3000`.

The frontend calls `/api/v1/*` and Next.js rewrites those requests to `BACKEND_URL`. This keeps browser API calls same-origin and lets the backend continue to own authentication cookies and CSRF validation.

## Docker startup

The frontend repository runs independently in Docker:

```bash
docker compose up --build
```

The container installs the frontend dependencies, builds the existing Next.js application, and starts the existing production server on host port `3000`.

Open:

```text
http://127.0.0.1:3000
```

The Docker Compose default for `BACKEND_URL` is `http://host.docker.internal:8000`. That value is supplied as both a build-time argument and a runtime environment variable because the Next.js rewrite configuration is evaluated during the application build.

Compose reads the Docker-specific `FIELDLINE_DOCKER_BACKEND_URL` override, rather than the local-development `BACKEND_URL` value from `.env`. This prevents a local `BACKEND_URL=http://127.0.0.1:8000` from making the frontend container try to reach itself.

The Compose file maps `host.docker.internal` to the Docker host gateway so the frontend container can reach a backend independently exposed on host port `8000` on Docker environments that support the `host-gateway` mapping.

The frontend does not start PostgreSQL or the backend. The companion backend must be running separately, for example through its own repository's Docker Compose configuration.

Stop the frontend container:

```bash
docker compose down
```

Rebuild:

```bash
docker compose up --build
```

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `BACKEND_URL` | Existing application variable used by the Next.js server rewrite. | `http://127.0.0.1:8000` for local development |
| `FIELDLINE_DOCKER_BACKEND_URL` | Optional Docker-only override used by the Compose file for both build time and runtime. | `http://host.docker.internal:8000` |

Do not put secrets in frontend environment variables that are exposed to browser code.

For Docker, override the backend URL when the backend is exposed somewhere other than host port `8000`:

```bash
FIELDLINE_DOCKER_BACKEND_URL=http://host.docker.internal:8000 docker compose up --build
```

On PowerShell:

```powershell
$env:FIELDLINE_DOCKER_BACKEND_URL="http://host.docker.internal:8000"
docker compose up --build
```

## Backend

The companion API lives in [fieldline-crm-backend](https://github.com/faizansaiyed123/fieldline-crm-backend).

The frontend does not require Redis, a worker, or any other local supporting service. The backend repository owns PostgreSQL and backend startup.

## Checks

```bash
npm run typecheck
npm run build
npm run e2e
```

The real-backend E2E workflow starts PostgreSQL and the companion backend before running the frontend tests.

## Manual setup

A working backend must be available at the configured `BACKEND_URL`. The frontend repository intentionally does not create a combined frontend/backend Compose project.

# Fieldline CRM Frontend

Web application for **Fieldline CRM**.

Fieldline is a focused CRM workspace for customer relationships, sales pipeline execution, explainable operational intelligence, data quality, and follow-through.

## Product walkthrough

Explore the [Fieldline CRM product walkthrough](docs/PRODUCT-WALKTHROUGH.md), including connected customer workflows and examples of persisted state being read back through the API.

## Stack

- Next.js 16
- React 19
- TypeScript
- TanStack React Query
- Playwright

## Local setup

Install the exact dependency versions from the committed lockfile:

```bash
npm ci
```

Create `.env.local` from `.env.example`:

```env
BACKEND_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

The browser app runs on `http://127.0.0.1:3000`.

The frontend calls `/api/v1/*` and Next.js rewrites those requests to `BACKEND_URL`. This keeps browser API calls same-origin and lets the backend continue to own authentication cookies and CSRF validation.

## Production deployment

Deploy the frontend and backend independently. Configure the frontend's **build-time** `BACKEND_URL` as the public HTTPS URL of the backend, for example:

```env
BACKEND_URL=https://api.your-domain.example
```

The URL must be reachable from the Next.js server/container. The API path is added by the existing Next.js rewrite; do not append `/api/v1` to the base URL. This is a server-side rewrite, so browser requests remain same-origin with the frontend and the backend should not need to be called directly by client-side JavaScript.

In containerized deployments, pass `BACKEND_URL` as a Docker build argument as well as setting the runtime variable. The current `next.config.ts` reads it when the Next.js build runs. A runtime-only setting will not change a rewrite that was already baked into the build.

Do not place secrets in frontend environment variables that are exposed to browser code. Authentication signing keys and database credentials belong only in the backend's secret configuration.

## Docker startup

The frontend repository runs independently in Docker:

```bash
docker compose up --build
```

The Docker image installs the committed dependency graph with `npm ci`, builds the existing Next.js application, and starts the production server on port `3000`.

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
| `BACKEND_URL` | Existing application variable used by the Next.js server rewrite; set it at build time for deployment. | `http://127.0.0.1:8000` locally, or the backend HTTPS URL in production |
| `FIELDLINE_DOCKER_BACKEND_URL` | Optional Docker-only override used by Compose for both build time and runtime. | `http://host.docker.internal:8000` |

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
npm ci
npm run typecheck
npm run build
npm run e2e
docker build --build-arg BACKEND_URL=http://127.0.0.1:8000 --tag fieldline-crm-frontend:local .
```

The real-backend E2E workflow starts PostgreSQL and the companion backend before running the frontend tests.

## Manual setup

A working backend must be available at the configured `BACKEND_URL`. The frontend repository intentionally does not create a combined frontend/backend Compose project.

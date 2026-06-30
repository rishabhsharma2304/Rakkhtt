# Rakkhtt — Blood Centre Management

A multi-tenant blood bank / blood centre management web application: donation camps,
donors, bag entry, the full lab pipeline (component preparation, grouping, TTI
screening), tested-stock movement, inventory, QC, reception (blood-issue requests),
accounting, analytics and NABH/NBTC-style compliance reports.

> **Branding** is a single config constant (`BRAND_NAME` in the backend, `BRAND` in
> `frontend/src/lib/brand.ts`). It defaults to **Rakkhtt** with a droplet+pulse logo, per
> the design handoff in [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md). Change it once
> to rebrand the whole app. All seed data is **100% synthetic** (Faker) — no real names,
> phone numbers or government IDs.

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL 16 · Pydantic v2 · JWT (python-jose) · passlib[bcrypt] · Faker |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS · React Router v6 · TanStack Query/Table · axios · lucide-react · date-fns |
| Infra    | docker-compose (db + api + web) with hot reload |

## Prerequisites

- **Docker** + Docker Compose v2 — the only hard requirement for the one-command quick start.
- **Node 18+** and **Python 3.12** — only needed for the "without Docker" path below; the
  containers bundle their own runtimes.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- **Web app:** http://localhost:5173
- **API docs (OpenAPI):** http://localhost:8000/docs
- **Postgres:** localhost:**5433** (mapped from container 5432 to avoid clashing with a local Postgres)

On startup the API runs `alembic upgrade head`, seeds synthetic data, then serves with
`--reload`. The web container runs the Vite dev server with hot reload.

### Demo login

| Field | Value |
|-------|-------|
| Email | `admin@acbc.in` |
| Password | `password123` |

Two blood centres are seeded — **Arogya City Blood Centre (ACBC)** and **Jeevan Dhara
Blood Bank (JDBB)** — switch between them with the centre selector in the top bar. Every
query is scoped to the active centre. Each centre also has technician / supervisor /
motivation / general staff (`<designation>.<prefix>@example.in` / `password123`).

## Sign in with Google & self-serve onboarding

A new operator can sign up for their **own** blood centre with no manual provisioning —
Google Sign-In is free (OAuth 2.0 / OpenID Connect, no per-login cost).

**Setup (once, by the app owner):**

1. In **Google Cloud Console → APIs & Services → Credentials**, create an **OAuth 2.0
   Client ID** of type **Web application**.
2. Add your frontend URL(s) to **Authorized JavaScript origins** (e.g.
   `http://localhost:5173` for dev, `https://app.example.com` for prod).
3. Put the client ID in `.env` as `GOOGLE_CLIENT_ID=...`. That single value enables the
   button in the UI **and** the server-side ID-token verification. Leave it blank to run
   email/password only.

**Flow:** the browser gets a Google ID token → `POST /auth/google` verifies it against
`GOOGLE_CLIENT_ID`. If the email already has an account it logs straight in (and links
Google to a pre-existing password account on first use). If it's a brand-new user, the
API returns a short-lived registration token and the app shows the **onboarding** screen
(`/onboard`): the user names their blood centre and is created as its **master user**
(own `org_id`, full RBAC). No password is stored for Google accounts (`password_hash`
is nullable; `auth_provider = "google"`).

## Running locally without Docker

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://bloodbank:bloodbank@localhost:5433/bloodbank
alembic upgrade head
python -m app.seeds.run
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

## Deployment

Production uses the **same `docker-compose.yml`** but with no dev-convenience
fallbacks — every variable must be supplied explicitly. Both compose (via `:?`
guards) and the API (`Settings.validate_runtime`) **fail fast** if anything
required is missing, so a misconfigured deploy never boots.

```bash
cp .env.production.example .env   # then fill in EVERY value
docker compose up --build -d
```

### Checklist

- [ ] **Copy the template:** `cp .env.production.example .env` and fill in every
  variable — there are no defaults (see the file for what each one means).
- [ ] **Strong DB credentials:** unique `POSTGRES_USER` / `POSTGRES_PASSWORD` /
  `POSTGRES_DB`; never reuse the example values.
- [ ] **`DATABASE_URL` matches** the `POSTGRES_*` values and points at the `db`
  host (`...@db:5432/...`).
- [ ] **Real `JWT_SECRET`:** `openssl rand -hex 32`. The app rejects a blank value
  and the `dev-secret-change-me` placeholder.
- [ ] **`CORS_ORIGINS`** set to the exact public frontend URL(s) — no localhost.
- [ ] **`VITE_API_URL`** set to the public API URL — no localhost. (It is baked
  into the built frontend, so set it before building.)
- [ ] **`SEED_ON_START=false`** — `true` wipes & reseeds synthetic data on every
  boot and will destroy real data.
- [ ] **`LOG_JSON=true`** (structured logs for your collector) and `LOG_LEVEL=INFO`.
- [ ] **Secrets stay secret:** keep `.env` out of version control and out of
  images; rotate `JWT_SECRET` / DB credentials per your policy.
- [ ] **Migrations run:** the api container runs `alembic upgrade head` on start —
  confirm it succeeds in the logs before serving traffic.
- [ ] **TLS / reverse proxy:** terminate HTTPS in front of the `web` and `api`
  ports (8000 / 5173); they are plain HTTP inside the compose network.

> The dev quick start above intentionally uses `.env.example`, which ships
> localhost values and `SEED_ON_START=true` for convenience. Do **not** use it in
> production.

## Screens

The four hero screens are built pixel-faithfully to the design handoff (crimson/rose
theme, Plus Jakarta Sans + Bricolage Grotesque):

- **Home** — KPIs, blood-stock-by-component matrix (tested/untested/reserved), work-completed
  ring, component-split donut, available-units-by-group bar chart.
- **Reception** — issue/bulk/fractionation/inward tabs, live search, "Show Pending Only"
  toggle, sortable billing/serology table.
- **Analytics** — Performance Indicators (9 NABH KPIs with sparklines) + Graphs (per-report
  bar chart, group donut, 6-month trend line).
- **Camp** — June 2026 calendar with camp events + overview (collection per camp, donut).

Plus full modules wired to the API: Donors, Blood Bag entry, the three lab pipelines
(Component / Grouping / TTI) with steppers + advance actions, Shift to Tested Stock,
Lab Quarantine & Discard, Store, QC, Donor Recall (with WhatsApp action), Accounting,
Directory (Organisation / Vehicle / Hospital / Patient / Thalassemia / Therapeutic /
Inquiry), Users, Tools (with a live Composite Label generator), Settings, MIS Reports,
Registers and Feedback (3-card summary). Reception rows have a one-click **Issue**
action that allocates tested units, raises an invoice, and completes billing + serology.

### RBAC (Section 9)

JWT carries the active org + role; every mutation is re-checked server-side. Roles:
`master_user`/`admin` (full), `technical_supervisor` (validate + discard + shift),
`technician` (data entry), `motivation` (donor/camp/recall/feedback), `general`
(read + reception). The UI hides actions a role can't perform (`frontend/src/lib/rbac.ts`),
and the API returns `403` regardless. Try a non-admin seed login, e.g.
`technician.acbc@example.in` / `password123`.

## What's built per phase

- [x] **Phase 1 — Foundation.** Multi-tenant data model, JWT auth + org-switch, RBAC core,
  docker-compose (db + api + web), Alembic migrations and the synthetic seed pipeline.
- [x] **Phase 2 — Masters / CRUD.** Generic CRUD factory (list/search/sort/filter/soft-delete),
  the shared frontend UI kit, and master-data screens wired end to end.
- [x] **Phase 3 — Camps · Donors · Bag entry.** Create-camp form, donor dashboard (tabs + Add▾),
  choose-a-camp blood-bag entry, mixed-status donation seeding.
- [x] **Phase 4 — Lab pipelines.** Component-prep / grouping / TTI state machines with steppers,
  reactive-unit quarantine & discard, and shift-to-tested-stock promotion.
- [x] **Phase 5 — Store · QC · Reception · Accounting.** Tabbed Store + QC, Reception
  add/return/issue (allocate → invoice → bill + serology), and the accounting views.
- [x] **Phase 6 — Reports · Tools · Dashboard.** Home KPIs/charts, NABH performance indicators,
  MIS reports, and Tools (live Code128 composite-label generator + CSV/SVG export).
- [x] **Phase 7 — Polish.** Two-layer RBAC enforcement, pytest smoke suite, dark mode, responsive
  nav, shared loading/empty/error states, and this README.

## Architecture notes

- **Multi-tenancy:** every domain table carries `org_id`; the JWT carries the active org and
  all queries filter on it. `POST /auth/switch-org/{id}` re-issues a token for another centre.
- **Generic CRUD:** `backend/app/api/v1/crud_factory.py` builds consistent list (pagination +
  search + sort + field filters) / get / create / update / soft-delete routers from a model +
  Pydantic schemas. Registered in `registry.py`.
- **Lab pipelines** (`workflows.py`) are real state machines over `BloodBag` / `Component` /
  `GroupingResult` / `TTIResult`. Reactive TTI units route components to quarantine; shift-to-
  tested only promotes grouping-validated + TTI-clear components.
- **Reports** (`reports.py`) are computed aggregations (dashboard summary, stock matrix,
  performance indicators, graphs, MIS, accounting) — not stored.
- `ASSUMPTION:` comments mark clinical defaults chosen where the spec was ambiguous (e.g.
  90-day donor recall eligibility, component shelf lives, multi-org membership for the demo).

## Testing

Backend smoke tests live in `backend/tests/` (pytest + FastAPI `TestClient`). They cover
authentication, a full CRUD lifecycle (donors), a lab workflow read/transition, and — the
key RBAC guarantee — that non-admin roles are **denied restricted actions server-side**
(a technician cannot shift-to-tested, advance a validation stage, or manage staff, but
*can* do data entry). The suite is self-contained: it logs in as the seeded master account
and provisions any other role it needs via the API.

Run them inside the running api container:

```bash
docker compose exec api python -m pytest -q
```

Or locally against a reachable, seeded database (see "Running locally without Docker"):

```bash
cd backend && python -m pytest -q
```

## Polish & accessibility

- **RBAC is enforced in two layers.** The API is the source of truth — every mutation
  re-checks the caller's role and returns `403` otherwise. The UI additionally hides or
  disables actions the active role can't perform (`frontend/src/lib/rbac.ts`, a mirror of
  `backend/app/core/rbac.py`), so restricted buttons never appear in the first place.
- **Responsive:** the top bar collapses its search/profile labels on small screens and the
  primary navigation switches to a hamburger menu below the `lg` breakpoint; data tables
  scroll horizontally and KPI/stat grids reflow from 1→2→4 columns.
- **Dark mode:** toggle in the top bar (persisted to `localStorage`). Semantic surface,
  text and border tokens remap under the `.dark` class (`frontend/src/styles/tokens.css`).
- **States everywhere:** lists and dashboards render explicit loading (spinner), empty, and
  error states via shared primitives in `frontend/src/components/ui.tsx`.

## Compliance copy

NABH · NBTC · Drugs & Cosmetics Act 1940 · e-Rakt-Kosh compatible labels are **display-only**
— no real external integration is implemented.

## Project layout

```
backend/   FastAPI app (core, db, models, schemas, api/v1, services, seeds) + alembic + tests/
frontend/  Vite React app (lib, components, pages) + Tailwind crimson token layer
docs/      DESIGN_HANDOFF.md + design-reference/ (original .dc.html prototype, reference only)
docker-compose.yml · .env.example (dev) · .env.production.example (deploy)
```

@.claude/shared-rules.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The core API for the Need4Deed platform — a Berlin-based NGO that connects volunteers with refugee accommodation centers. This backend manages users, deeds (tasks/opportunities), volunteer profiles, center profiles, and the matching logic between them.

Built with: **Node.js 22+ / TypeScript / Fastify 5 / TypeORM / PostgreSQL**, deployed on Kubernetes (k3s) — prod on a dedicated Infomaniak VPS, dev/pre on the shared AITS VPS. See the `infra` repo (`infra/CLAUDE.md`, `infra/docs/dev-guide.md`) for the deployment setup.

This is an open-source project. Contributors may be volunteer developers with varying experience levels. Be patient, explain clearly, and avoid introducing unnecessary complexity.

---

## Domain concepts

- **Opportunity** — a task posted by an accommodation center (e.g. "German tutoring 2hrs/week", "translation support")
- **Volunteer** — a person who registers to help; has skills, languages, and location
- **Agent** — a refugee accommodation center in Berlin that posts opportunities
- **Deal** — a volunteer's profile/matching record, separate from their personal data
- **Match** (`OpportunityVolunteer`) — the m2m join between a volunteer and an opportunity
- **SDK** (`need4deed-sdk`) — shared TypeScript types used by both frontend and backend. Always use SDK types for shared data shapes. Never duplicate them locally.

Data protection is critical. Never log personal data. Never expose personal data beyond what is needed. Follow GDPR: data minimization, purpose limitation.

---

## Commands

`package.json`'s `scripts` has the standard ones (dev, start, lint, typecheck, format, test:run, test:watch, migration:run/revert/show). Two are worth calling out because the argument convention isn't obvious from the script name alone:

```bash
yarn migration:generate src/data/migrations/kebab-case-name  # generate migration from entity diff
yarn migration:create src/data/migrations/kebab-case-name    # create bare migration
```

Pending migrations are auto-run on server startup only when `RUN_MIGRATIONS=true` (or `NODE_ENV=production`); see `src/data/index.ts:26`. Without it, run `yarn migration:run` yourself. `docker compose up` sets `RUN_MIGRATIONS=true` by default; bare `yarn dev` honours whatever is in your `.env`.

Docker alternative (includes Postgres):

```bash
docker compose up           # starts db + bootstrap + be
```

To wipe the DB and replay the full migration chain from scratch (the canonical
check that a data/seed migration is self-contained) — see the
`flush-db-rebuild` skill.

---

## Architecture

### Request lifecycle

1. Route handler in `src/server/routes/` receives the request
2. Fastify validates request against a JSON schema from `src/server/schema/`
3. Handler fetches data via `fastify.db.<entity>Repository` (TypeORM)
4. Data is transformed through a DTO function from `src/services/dto/` before sending
5. Fastify serializes the response against the route's response schema

### TypeORM repositories

Repositories are attached to the Fastify instance by the TypeORM plugin (`src/server/plugins/typeorm.ts`). Access them in route handlers as:

```ts
fastify.db.volunteerRepository;
fastify.db.opportunityRepository;
// etc.
```

All entity column names use `SnakeCaseNamingStrategy` (defined in `src/data/lib/snake-case.ts`), so TypeScript property `firstName` maps to DB column `first_name` automatically.

### Authentication

The JWT plugin (`src/server/plugins/jwt.ts`) decorates `fastify.authenticate`. Use it as a `preHandler`:

```ts
fastify.get(
  "/path",
  {
    preHandler: fastify.authenticate({ role: UserRole.ADMIN }),
  },
  handler,
);
```

Options: `role` restricts to a specific role; `allowSelf` restricts to the resource owner by `id` param. Admin users bypass all role/self checks. Mark public routes with `config: { public: true }`.

Auth uses httpOnly cookies: `access` (15 min JWT) and `refresh` (7 day JWT).

### DTOs and serialization

`src/services/dto/` contains pure functions that transform TypeORM entities into API response shapes. DTOs are named `dtoXxx` (output) or `parserXxx` (input parsing). Always go through a DTO before sending entity data in a response.

### JSON schema validation

Route-level request/response schemas live in `src/server/schema/`. Some schemas are JSON files (registered globally in `createServer`), others are TypeScript objects. All schemas follow Fastify/AJV conventions with `$ref` for reuse.

### Error handling

Throw subclasses of `BaseError` from `src/config/error/` (e.g. `NotFoundError`, `BadRequestError`) — the global error handler in `createServer` will set the correct HTTP status code. Do not throw raw `Error` objects for expected failure cases.

### Route prefixes

All route prefixes are defined in `RoutePrefix` in `src/server/types/enums.ts`. Register routes using those constants.

---

## Key conventions

- **Never edit existing migration files** — always generate a new one
- **Never add entity columns without a migration**
- **Never duplicate SDK types** — import from `need4deed-sdk`
- **Never merge into `main`** — it's for production deploys only; target `develop`
- **Never log `req.body`** wholesale — may contain personal data
- **Migration file names must use kebab-case** — e.g. `add-postcode-to-accompanying`, never PascalCase
- Branch naming: `<issue-number>-short-description` (e.g. `502-add-postcode-to-accompanying`)
- Default branch is `develop`

---

## Testing

Tests live in `src/test/`, mirroring the `src/` structure. Vitest runs with `NODE_ENV=test` and skips migrations. Tests do **not** use mocked repositories — they hit a real database. Run `docker compose up db` or have Postgres available locally before running tests.

Run a single test file: `yarn test -- src/test/services/dto/dto-person.test.ts`

---

## Environment

Copy `.env.example` to `.env` and fill in real values. Key variables:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA` — Postgres connection
- `DB_SSL_CA_PATH` — optional; path to the CA certificate used to verify the Postgres server in `production`/`staging` (defaults to the baked-in AWS RDS bundle; TLS verification is always strict)
- `JWT_SECRET` — required; server refuses to start without it
- `NODE_ENV` — `development` | `test` | `production`
- `RUN_MIGRATIONS` — see Commands section above

See `.env.example` for `EMAIL_FROM`/`SMTP_*`, `EMAIL_FROM_NOTIFY`/`SMTP_NOTIFY_*`, `EMAIL_TEMPLATE_*`, and `CORS_ORIGINS` — each documented there with inline comments.

---

## TypeORM entities sync to database DDL

Any changes in entities that are registered in `src/data/data-source.ts` must be synced with the database DDL by running:

```
yarn migration:generate src/data/migrations/<short-description-in-kebab=case>
```

---

## API contract

The runtime contract is at https://dev.need4deed.org/swagger/json

The transpile time contract is at SDK (`yarn upgrade need4deed-sdk --latest`)

All amendments have to land in schemas for endpoint handlers and in SDK

---

## Private instructions

@dev/CLAUDE.md

---

## Exposing PII

User role `coordinator` is granted to deal with PII.
Slack channels for notification and tagging are closed and PII safe.

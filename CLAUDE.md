# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The core API for the Need4Deed platform — a Berlin-based NGO that connects volunteers with refugee accommodation centers. This backend manages users, deeds (tasks/opportunities), volunteer profiles, center profiles, and the matching logic between them.

Built with: **Node.js 22+ / TypeScript / Fastify 5 / TypeORM / PostgreSQL**, deployed on AWS.

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

```bash
yarn dev                    # start with nodemon (hot reload)
yarn start                  # start without nodemon
yarn test:run               # run all tests once (vitest)
yarn test:watch             # run tests in watch mode
yarn test -- path/to/file   # run a single test file
yarn lint                   # ESLint
yarn typecheck              # TypeScript type checking (no emit)
yarn format                 # Prettier
yarn migration:run          # run pending migrations
yarn migration:generate src/data/migrations/kebab-case-name  # generate migration from entity diff
yarn migration:create src/data/migrations/kebab-case-name    # create bare migration
yarn migration:revert       # revert last migration
yarn migration:show         # show migration status
```

Pending migrations are auto-run on server startup only when `RUN_MIGRATIONS=true` (or `NODE_ENV=production`); see `src/data/index.ts:26`. Without it, run `yarn migration:run` yourself. `docker compose up` sets `RUN_MIGRATIONS=true` by default; bare `yarn dev` honours whatever is in your `.env`.

Docker alternative (includes Postgres):

```bash
docker compose up           # starts db + bootstrap + be
```

### Flushing the database (fresh rebuild)

To wipe the DB and replay the full migration chain from scratch — e.g. to
verify migrations are self-contained and replay cleanly:

```bash
docker compose down -v                  # stop + drop the be_database volume
RUN_MIGRATIONS=1 docker compose up      # db -> bootstrap (re-seeds) -> be runs all migrations
```

`down -v` removes the `be_database` volume (the data); the next `up` re-seeds
via the `bootstrap` service, then `be` runs every migration on startup
(`RUN_MIGRATIONS=1` forces it on regardless of `.env`). Watch the `be` logs —
the run must reach `Migrations completed` with no `column ... does not exist`
errors.

**This is the canonical check that a data/seed migration is self-contained.**
Migrations must depend only on **raw SQL + hardcoded literals** — never import
live entities, app helpers, config constants, or **SDK enums** (an enum value
can change with a contract update, retroactively altering what an old migration
emits). A migration that reaches for the current entity/enum shape will pass on
the DB it was written against but break on a fresh replay once that shape drifts.

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
- `JWT_SECRET` — required; server refuses to start without it
- `NODE_ENV` — `development` | `test` | `production`
- `RUN_MIGRATIONS` — when truthy, auto-run pending migrations on server startup (always on in prod regardless of this flag); see Commands section
- `EMAIL_FROM`, `BREVO_API_KEY` — transactional email via Brevo (verified sender + API key)
- `EMAIL_TEMPLATE_TTL_MS`, `EMAIL_TEMPLATE_FETCH_TIMEOUT_MS` — optional; cache TTL + fetch timeout for the verification-email CDN manifest (`${CDN_BASE_URL}emails/verification.json`); falls back to built-in copy
- `CORS_ORIGINS` — comma-separated list of allowed origins

---

## TypeORM entities sync to database DDL

Any changes in entities that are registered in `src/data/data-source.ts` must be synced with the database DDL by running:

```
yarn migration:generate src/data/migrations/<short-description-in-kebab=case>
```

---

## Handling throws in endpoint handlers

Avoid `try {} catch {}` blocks relaying on error handling by fastify.

Just throw specific error based on `src/config/error`

If needed update error handling in `src/server/index.ts`

---

## API contract

The runtime contract is at https://app.need4deed.org/swagger/json

The transpile time contract is at SDK (`yarn upgrade need4deed-sdk --latest`)

All amendments have to land in schemas for endpoint handlers and in SDK

---

## Private instructions

@dev/CLAUDE.md

---

## Exposing PII

User role `coordinator` is granted to deal with PII.
Slack channels for notification and tagging are closed and PII safe.

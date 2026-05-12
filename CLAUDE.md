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

Docker alternative (includes Postgres):

```bash
docker compose up           # starts db + bootstrap + be
```

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
- `RUN_MIGRATIONS` — set to `true` to auto-run migrations on startup
- `AWS_SES_*` — email sending via AWS SES
- `CORS_ORIGINS` — comma-separated list of allowed origins

# CLAUDE.md — Need4Deed Backend (`be`)

## What this repo is
The core API for the Need4Deed platform — a Berlin-based NGO that connects volunteers
with refugee accommodation centers. This backend manages users, deeds (tasks/opportunities),
volunteer profiles, center profiles, and the matching logic between them.

Built with: **Node.js + TypeScript + TypeORM + PostgreSQL**, deployed on AWS.

This is an open-source project. Contributors may be volunteer developers with varying
experience levels. Be patient, explain clearly, and avoid introducing unnecessary complexity.

---

## Project domain — read this first

Key concepts you must understand before touching any code:

- **Deed** — a task or opportunity posted by an accommodation center (e.g. "German tutoring, 2hrs/week", "translation support", "childcare")
- **Volunteer** — a person who registers to help. Has skills, languages, and location.
- **Center** — a refugee accommodation center in Berlin that posts deeds and requests support
- **Match** — pairing a volunteer with a deed based on skills, languages, location, and availability
- **SDK** — shared TypeScript types live in the `sdk` repo. Always use SDK types for anything shared with the frontend. Never duplicate types locally.

Data protection is critical. We handle personal data of refugees and volunteers.
Never log personal data. Never expose personal data in API responses beyond what is needed.
Follow GDPR principles: data minimisation, purpose limitation.

---

## Architecture

```
be/                         ← you are here
  src/
    entities/               ← TypeORM database entities (Volunteer, Center, Deed, Match, ...)
    controllers/            ← Route handlers
    services/               ← Business logic (keep controllers thin)
    routes/                 ← Express route definitions
    migrations/             ← TypeORM migrations (never edit existing ones, always add new)
    middleware/             ← Auth, validation, error handling
  .env.example              ← Copy to .env for local dev
```

The frontend (`fe` repo) and backend communicate through types defined in the `sdk` repo.
If you add or change an API response shape, check if the SDK needs updating too.

---

## Local development setup

```bash
git clone https://github.com/need4deed-org/be.git
cd be
yarn install
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
yarn start
```

Requires: Node.js, PostgreSQL running locally, yarn.

**Database migrations:** Always run `yarn migration:run` after pulling. Never modify
existing migration files — create a new migration instead.

---

## Branching and commits

- Branch naming: `yourname/feature-name` (e.g. `sara/fix-volunteer-filter`)
- Commit emojis:
  - 🎨 Styling/UI
  - 🐛 Bug fix
  - ✨ New feature
  - 📝 Documentation
  - ♻️ Refactor
  - 🔒 Security / data protection

---

## How to contribute

1. Pick an issue labelled `good first issue` or `help wanted`
2. Ask questions in the issue before starting — don't assume requirements
3. Keep PRs small and focused on one thing
4. Never commit `.env` or any credentials
5. If unsure about data protection implications of a change, ask before implementing
6. default branch is `develop`. always merge feature branches to it!

---

## What NOT to do

- Do not log `req.body` wholesale — it may contain personal data
- Do not add new columns to entities without a migration
- Do not change existing migration files
- Do not duplicate types that already exist in the SDK
- Do not merge your own PRs — always get a review
- do not merge anything into `main`. it's solely for production deployments

---

## Current status (April 2026)

The app is in active development. The admin dashboard (internal use) is the current
priority — allowing the Need4Deed team to view volunteers, centers, and deeds, and
perform matches manually before the automated matching system is built.

The legacy backend (`alfred`, Python) is being retired. Do not reference it.

---

## Contact

Questions about the project: info@need4deed.org
For code questions: open a GitHub issue or comment on the relevant PR.

---
name: flush-db-rebuild
description: Wipe the local `be` database and replay every migration from scratch to verify a data/seed migration is self-contained. Use when asked to check a migration replays cleanly, or before landing a new data/seed migration.
---

# Flush and rebuild the database

To wipe the DB and replay the full migration chain from scratch:

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

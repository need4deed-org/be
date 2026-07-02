# Shared project rules

These rules apply to **all three repos** (`be`, `fe`, `sdk`). This file is synced from the
org `.github` repo — do not edit it inside a downstream repo; change it at the source and let
the sync open a PR. Repo-specific rules live below the import in each repo's own `CLAUDE.md`.

## API changes go through the SDK contract first

The `sdk` is the single source of truth for the API contract. Any change to the API surface
(endpoints, request/response shapes, types, error codes) **MUST** follow this order:

1. Define or update the contract in the `sdk` repo first.
2. Publish the new SDK version to npm.
3. Only then update `be` and `fe` to consume the change.

**IMPORTANT:** `be` and `fe` MUST depend on the SDK as published on **npmjs.com** — never on the
local `sdk` checkout or a sibling folder. Do not use `file:../sdk`, `npm link`, workspace or
`link:` references, or any other local linking for the SDK dependency. Pin to a version that is
actually published. If the version you need isn't on npmjs.com yet, the work is **not ready** to
land in `be`/`fe` — finish and publish the SDK first.

Do not implement or "stub" an API change in `be` or `fe` ahead of the contract. If the contract is
missing, wrong, or incomplete, fix it in `sdk` and publish — never work around it locally.

Allways make sure all API related issues are based on the latest dependency "need4deed-sdk".

## Reuse before you create

Before adding any new util, helper, hook, component, or shared function, **first search** the
codebase (and the SDK) for something that already does the job. Prefer reusing or extending
existing code over writing a near-duplicate. If nothing fits and you must add a new one, state
briefly why the existing options didn't work.

## Be conservative with database schema changes

Before altering the database schema:

- Confirm the change is **absolutely necessary** and cannot reasonably be solved without touching
  the schema.
- Confirm it is **semantically correct** — names and structure must match existing modeling
  conventions and clearly express what the data represents.

Surface the proposed change and your reasoning _before_ writing a migration. Schema changes are
deliberate decisions, not incidental side effects of a feature.

# Awesome Project Build with TypeORM

Steps to run this project:

1. Run `npm i` command
2. Setup database settings inside `data-source.ts` file
3. Run `npm start` command

## Running tests

The suite runs against a real Postgres. The easiest way to run it is the throwaway test DB (needs Docker):

```bash
yarn test:db:up && yarn test:db:seed && yarn test:db
yarn test:db:down
```

See the Testing section of [CLAUDE.md](CLAUDE.md) for details.

import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Allows using 'describe', 'it', 'expect' without importing
    environment: "node",
    setupFiles: ["./src/test/setup.ts"], // Optional: for DB connection logic
    include: ["**/*.{test,spec}.ts"],
    exclude: ["**/node_modules/**", "src/test/e2e/**"],
    // Each test file opens its own TypeORM connection pool against the same
    // real Postgres instance (max_connections: 100, see docker-compose.yaml).
    // Running files in parallel (Vitest's default) exhausts that ceiling
    // across ~98 files, causing random, file-order-dependent failures
    // (be#996) — a query on one file's pool intermittently fails while
    // another file's pool is mid-teardown. Serial execution is slower but
    // deterministic. `yarn test:db` (and CI) overrides this with
    // --fileParallelism: its db-test instance allows 500 connections (be#999).
    fileParallelism: false,
    env: {
      JWT_SECRET: "test-secret-only-for-vitest",
      NODE_ENV: "test",
      PORT: "5001",
    },
  },
  plugins: [
    swc.vite({
      jsc: {
        keepClassNames: true,
        target: "es2022",
        parser: {
          syntax: "typescript",
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});

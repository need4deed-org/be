import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Allows using 'describe', 'it', 'expect' without importing
    environment: "node",
    setupFiles: ["./tests/setup.ts"], // Optional: for DB connection logic
    include: ["**/*.{test,spec}.ts"],
  },
});

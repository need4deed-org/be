import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Allows using 'describe', 'it', 'expect' without importing
    environment: "node",
    setupFiles: ["./src/test/setup.ts"], // Optional: for DB connection logic
    include: ["**/*.{test,spec}.ts"],
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

import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./src/test/e2e/setup/global.ts"],
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/e2e/**/*.test.ts"],
    pool: "forks",
    fileParallelism: false,
    env: {
      JWT_SECRET: "test-secret-only-for-e2e-vitest",
      NODE_ENV: "test",
      PORT: "5002",
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

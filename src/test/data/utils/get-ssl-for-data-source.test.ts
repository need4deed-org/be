import { existsSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSslForDataSource } from "../../../data/utils";

const PEM =
  "-----BEGIN CERTIFICATE-----\nlocal-test-ca\n-----END CERTIFICATE-----\n";

describe("getSslForDataSource", () => {
  let dir: string;
  let caPath: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "db-ca-"));
    caPath = join(dir, "ca.pem");
    await writeFile(caPath, PEM, "utf-8");
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.each(["development", "test", "debug", "", undefined])(
    "returns false for %s even when a CA path is set",
    (env) => {
      expect(getSslForDataSource(env, caPath)).toBe(false);
    },
  );

  it.each(["production", "staging"])(
    "returns strict TLS with the CA content for %s",
    (env) => {
      expect(getSslForDataSource(env, caPath)).toEqual({
        rejectUnauthorized: true,
        ca: PEM,
      });
    },
  );

  it("names the path and DB_SSL_CA_PATH when the CA is unreadable", () => {
    const missing = join(dir, "missing.pem");
    expect(() => getSslForDataSource("production", missing)).toThrowError(
      /DB_SSL_CA_PATH/,
    );
    expect(() => getSslForDataSource("production", missing)).toThrowError(
      new RegExp(missing),
    );
  });

  it("rejects a CA file that contains no PEM certificate", async () => {
    const empty = join(dir, "empty.pem");
    await writeFile(empty, "", "utf-8");
    expect(() => getSslForDataSource("production", empty)).toThrowError(
      /contains no PEM certificate/,
    );
  });

  const DEFAULT_CA_PATH = "/app/certificates/eu-central-1-bundle.pem";

  it.skipIf(existsSync(DEFAULT_CA_PATH))(
    "falls back to the baked-in bundle path when no path is given",
    () => {
      expect(() => getSslForDataSource("production", undefined)).toThrowError(
        /\/app\/certificates\/eu-central-1-bundle\.pem/,
      );
    },
  );

  it.skipIf(existsSync(DEFAULT_CA_PATH))(
    "treats an empty-string path like an unset one",
    () => {
      expect(() => getSslForDataSource("production", "")).toThrowError(
        /\/app\/certificates\/eu-central-1-bundle\.pem/,
      );
    },
  );

  it("never disables certificate verification", () => {
    const ssl = getSslForDataSource("staging", caPath);
    expect(ssl).not.toBe(false);
    if (ssl !== false) {
      expect(ssl.rejectUnauthorized).toBe(true);
    }
  });
});

import * as fs from "fs";

const DEFAULT_CA_PATH = "/app/certificates/eu-central-1-bundle.pem";

export function getSslForDataSource(
  env: string | undefined,
  caPath: string | undefined,
): { rejectUnauthorized: true; ca: string } | false {
  if (env !== "production" && env !== "staging") {
    return false;
  }
  const path = caPath || DEFAULT_CA_PATH;
  try {
    return { rejectUnauthorized: true, ca: fs.readFileSync(path).toString() };
  } catch (error) {
    throw new Error(
      `Cannot read database CA certificate at "${path}" ` +
        `(set DB_SSL_CA_PATH to override): ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

import * as path from "path";

const publicFixturesFromHere = ["..", "..", "public", "data"];

const positives = ["1", "YES", "Yes", "yes", "TRUE", "True", "true"];

export const CDNBaseUrl =
  process.env.CDN_BASE_URL || "https://d2nwrdddg8skub.cloudfront.net";

export const selfUrl = process.env.SELF_URL || "http://vmpub:5000";

export const seedPLZFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "PLZs.json",
);
export const seedDistrictFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "districts-berlin.json",
);

export const seedLanguageFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "languages.json",
);

export const seedLanguageInUseFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "languages_in_use.json",
);

export const seedCategoryFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "categories.json",
);

export const seedActivityFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "activities.json",
);

export const seedSkillFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "skills.json",
);

export const seedLeadFromFile = path.join(
  __dirname,
  ...publicFixturesFromHere,
  "leads.json",
);

export const seedAgentsFile = path.join(
  __dirname,
  ...["..", "..", "dev", "files", "notion"],
  "nid-agents.json",
);

export const seedOpportunitiesFile = path.join(
  __dirname,
  ...["..", "..", "dev", "files", "notion"],
  "nid-opportunities.json",
);

export const seedVolunteersFile = path.join(
  __dirname,
  ...["..", "..", "dev", "files", "notion"],
  "nid-volunteers.json",
);

// export const seedAgentsFile = CDNBaseUrl + "/dev/agents.json";
// export const seedVolunteersFile = CDNBaseUrl + "/dev/volunteers.json";
// export const seedOpportunitiesFile = CDNBaseUrl + "/dev/opportunities.json";

export const urlEmailVerification =
  process.env.URL_EMAIL_VERIFICATION ||
  "https://app.need4deed.org/verify-email";

export const urlPasswordReset =
  process.env.URL_PASSWORD_RESET || "https://app.need4deed.org/reset-password";

// CDN manifest (per-locale subject + html/text) for the verification email.
export const emailVerificationManifestUrl =
  CDNBaseUrl + "/emails/verification.json";

// CDN manifest (per-locale subject + html/text) for the password reset email.
export const emailPasswordResetManifestUrl =
  CDNBaseUrl + "/emails/password-reset.json";
// How long a fetched email manifest is cached in-memory (default 10 min).
export const emailTemplateTtlMs =
  Number(process.env.EMAIL_TEMPLATE_TTL_MS) || 10 * 60 * 1000;
// Timeout for fetching the email manifest from the CDN (default 5s).
export const emailTemplateFetchTimeoutMs =
  Number(process.env.EMAIL_TEMPLATE_FETCH_TIMEOUT_MS) || 5000;

export const REFRESH_LIFESPAN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
export const ACCESS_LIFESPAN_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
export const VERIFY_LIFESPAN_MS = 24 * 60 * 60 * 1000; // 24h in milliseconds
export const RESET_LIFESPAN_MS = 60 * 60 * 1000; // 60 minutes in milliseconds
export const pluginTimeout = 300 * 1000; // 30s in milliseconds

export const accessCookieName = "access";
export const refreshCookieName = "refresh";
export const cookieOptions = {
  signed: (process.env.SIGN_COOKIES || "false") === "true",
  httpOnly: true,
  secure: (process.env.NODE_ENV || "development") === "production",
  sameSite: ((process.env.NODE_ENV || "development") === "production"
    ? "none"
    : "lax") as boolean | "none" | "lax" | "strict",
  path: "/",
};

// Provider-neutral from address; must be a verified sender in the email provider.
export const defaultFrom = process.env.EMAIL_FROM || "";

export const isDev = process.env.NODE_ENV === "development";
export const isTest = process.env.NODE_ENV === "test";
export const isProd = process.env.NODE_ENV === "production";
export const isStaging = process.env.NODE_ENV === "staging";
export const shouldTruncateAll = positives.includes(
  process.env.TRUNCATE_ALL || "",
);
export const shouldRunMigrations = positives.includes(
  process.env.RUN_MIGRATIONS || "",
);
export const nidsToken = process.env.NIDS_TOKEN || "";

export const authAccessTokenCookieName = "access";
export const authRefreshTokenCookieName = "refresh";

export const defaultPageSize = 12;

export const titleOrphanageAgent = "Orphanage For Opportunities";

// sv-SE locale yields ISO-like formatting
export const berlinDateTimeFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

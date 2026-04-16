import * as path from "path";

const publicFixturesFromHere = ["..", "..", "public", "data"];

const positives = ["1", "YES", "Yes", "yes", "TRUE", "True", "true"];

export const awsS3BaseUrl =
  process.env.AWS_S3_BASE || "https://d2nwrdddg8skub.cloudfront.net/dev/";

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

// export const seedAgentsFile = path.join(
//   __dirname,
//   ...["..", "..", "dev", "pii"],
//   "agents.json",
// );

// export const seedOpportunitiesFile = path.join(
//   __dirname,
//   ...["..", "..", "dev", "pii"],
//   "opportunities.json",
// );

// export const seedVolunteersFile = path.join(
//   __dirname,
//   ...["..", "..", "dev", "pii"],
//   "volunteers.json",
// );

export const seedAgentsFile = awsS3BaseUrl + "agents.json";
export const seedVolunteersFile = awsS3BaseUrl + "volunteers.json";
export const seedOpportunitiesFile = awsS3BaseUrl + "opportunities.json";

export const urlEmailVerification =
  process.env.URL_EMAIL_VERIFICATION ||
  "https://app.need4deed.org/verify-email";

export const REFRESH_LIFESPAN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
export const ACCESS_LIFESPAN_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
export const VERIFY_LIFESPAN_MS = 24 * 60 * 60 * 1000; // 24h in milliseconds
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

export const defaultFrom = process.env.AWS_SES_FROM_EMAIL || "";

export const isDev = process.env.NODE_ENV === "development";
export const isTest = process.env.NODE_ENV === "test";
export const isProd = process.env.NODE_ENV === "production";
export const shouldTruncateAll = positives.includes(process.env.TRUNCATE_ALL);
export const shouldRunMigrations = positives.includes(
  process.env.RUN_MIGRATIONS,
);

export const authAccessTokenCookieName = "access";
export const authRefreshTokenCookieName = "refresh";

export const defaultPageSize = 12;

export const titleOrphanageAgent = "Orphanage For Opportunities";

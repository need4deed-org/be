import * as path from "path";

const publicFixturesFromHere = ["..", "..", "public", "fixtures"];

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

export const urlEmailVerification =
  process.env.URL_EMAIL_VERIFICATION ||
  "https://app.need4deed.org/verify-email";

export const REFRESH_LIFESPAN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
export const ACCESS_LIFESPAN_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
export const VERIFY_LIFESPAN_MS = 24 * 60 * 60 * 1000; // 24h in milliseconds

export const accessCookieName = "access";
export const refreshCookieName = "refresh";
export const cookieOptions = {
  signed: (process.env.SIGN_COOKIES || "false") === "true",
  httpOnly: true,
  secure: (process.env.NODE_ENV || "development") === "production",
  sameSite: "none" as boolean | "none" | "lax" | "strict",
  path: "/",
};

export const defaultFrom = process.env.AWS_SES_FROM_EMAIL || "";

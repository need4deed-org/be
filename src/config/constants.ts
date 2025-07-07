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

export const defaultFrom = process.env.AWS_SES_FROM_EMAIL || "";

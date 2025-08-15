import { AppDataSource } from "../data-source";
import { seedActivity } from "./activity.seed";
import { seedCategory } from "./category.seed";
import { seedDistrict } from "./district.seed";
import { seedFieldTranslation } from "./field_translation.seed";
import { seedLanguage } from "./language.seed";
import { seedPostcode } from "./postcode.seed";
import { seedSkill } from "./skill.seed";

export async function seed() {
  await seedLanguage(AppDataSource);
  await seedCategory(AppDataSource);
  await seedActivity(AppDataSource);
  await seedSkill(AppDataSource);
  await seedFieldTranslation(AppDataSource);
  await seedPostcode(AppDataSource);
  await seedDistrict(AppDataSource);
}

import { AppDataSource } from "./data-source";
import { seedActivity } from "./seeds/activity.seed";
import { seedCategory } from "./seeds/category.seed";
import { seedFieldTranslation } from "./seeds/field_translation.seed";
import { seedLanguage } from "./seeds/language.seed";
import { seedSkill } from "./seeds/skill.seed";

AppDataSource.initialize()
  .then(() => {
    seedLanguage(AppDataSource);
    seedCategory(AppDataSource);
    seedActivity(AppDataSource);
    seedSkill(AppDataSource);
    seedFieldTranslation(AppDataSource);
  })
  .catch((error) => {
    console.log(error);
    throw Error(error);
  });

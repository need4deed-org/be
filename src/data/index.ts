import { AppDataSource } from "./data-source";
import { seedFieldTranslation } from "./seeds/field_translation.seed";
import { seedLanguage } from "./seeds/language.seed";

AppDataSource.initialize()
  .then(() => {
    seedLanguage(AppDataSource);
    seedFieldTranslation(AppDataSource);
  })
  .catch((error) => {
    console.log(error);
    throw Error(error);
  });

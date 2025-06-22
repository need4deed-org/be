import { DataSource, Repository } from "typeorm";

import { seedLanguageInUseFile } from "../../config/constants";
import FieldTranslation from "../entity/field_translation.entity";
import Language from "../entity/language.entity";
import { readJsonAsync } from "../utils";

interface LanguageInUseJSON {
  id: string;
  title: { en: string; de: string };
}

async function seedLanguagesInUse(
  fieldTranslationRepository: Repository<FieldTranslation>,
  languageRepository: Repository<Language>,
  langEN: Language,
  langDE: Language,
) {
  const languagesTranslations = (await readJsonAsync(
    seedLanguageInUseFile,
  )) as LanguageInUseJSON[];

  const existingLanguageTranslations = await fieldTranslationRepository.find({
    where: { entityName: "Language" },
    relations: ["language"],
  });

  const existingLanguageTranslationsSet = new Set(
    existingLanguageTranslations
      ? existingLanguageTranslations.map(
          (translation) =>
            `${translation.language.isoCode}_${translation.translation}`,
        )
      : [],
  );

  const translationsForInsert: FieldTranslation[] = [];
  for (const languageTranslation of languagesTranslations) {
    const {
      id: isoCode,
      title: { en, de },
    } = languageTranslation;
    if (!existingLanguageTranslationsSet.has(`en_${en}`)) {
      const language = await languageRepository.findOne({
        where: { isoCode },
      });
      const translationEN = new FieldTranslation();
      translationEN.translation = en;
      translationEN.entityName = "Language";
      translationEN.entityId = language.id;
      translationEN.language = langEN;
      translationsForInsert.push(translationEN);
    }
    if (!existingLanguageTranslationsSet.has(`de_${de}`)) {
      const language = await languageRepository.findOne({
        where: { isoCode },
      });
      const translationDE = new FieldTranslation();
      translationDE.translation = de;
      translationDE.entityName = "Language";
      translationDE.entityId = language.id;
      translationDE.language = langDE;
      translationsForInsert.push(translationDE);
    }
  }

  try {
    await fieldTranslationRepository.insert(translationsForInsert);
  } catch (error) {
    throw new Error(`Error inserting language translations: ${error.message}`);
  }
}

export async function seedFieldTranslation(
  dataSource: DataSource,
): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const fieldTranslationRepository = dataSource.getRepository(FieldTranslation);
  if (!fieldTranslationRepository) {
    throw new Error("FieldTranslation entity is not initialized.");
  }

  const languageRepository = dataSource.getRepository(Language);
  if (!languageRepository) {
    throw new Error("Language entity is not initialized.");
  }

  const langEN = await languageRepository.findOne({
    where: { isoCode: "en" },
  });
  if (!langEN) {
    throw new Error("English language is missing.");
  }
  const langDE = await languageRepository.findOne({
    where: { isoCode: "de" },
  });
  if (!langDE) {
    throw new Error("German language is missing.");
  }

  await seedLanguagesInUse(
    fieldTranslationRepository,
    languageRepository,
    langEN,
    langDE,
  );
}

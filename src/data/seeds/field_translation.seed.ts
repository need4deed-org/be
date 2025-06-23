import { DataSource, Repository } from "typeorm";

import { seedLanguageInUseFile } from "../../config/constants";
import FieldTranslation from "../entity/field_translation.entity";
import Language from "../entity/language.entity";
import { readJsonAsync } from "../utils";

const entityLanguageName = "Language";
const isoCodeEN = "en";
const isoCodeDE = "de";

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
    where: { entityName: entityLanguageName },
    relations: [entityLanguageName],
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
    if (!existingLanguageTranslationsSet.has(`${isoCodeEN}_${en}`)) {
      const language = await languageRepository.findOne({
        where: { isoCode },
      });
      if (language) {
        const translationEN = new FieldTranslation();
        translationEN.translation = en;
        translationEN.entityName = entityLanguageName;
        translationEN.entityId = language.id;
        translationEN.language = langEN;
        translationsForInsert.push(translationEN);
      }
    }
    if (!existingLanguageTranslationsSet.has(`${isoCodeDE}_${de}`)) {
      const language = await languageRepository.findOne({
        where: { isoCode },
      });
      if (language) {
        const translationDE = new FieldTranslation();
        translationDE.translation = de;
        translationDE.entityName = entityLanguageName;
        translationDE.entityId = language.id;
        translationDE.language = langDE;
        translationsForInsert.push(translationDE);
      }
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
    where: { isoCode: isoCodeEN },
  });
  if (!langEN) {
    throw new Error("English language is missing.");
  }
  const langDE = await languageRepository.findOne({
    where: { isoCode: isoCodeDE },
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

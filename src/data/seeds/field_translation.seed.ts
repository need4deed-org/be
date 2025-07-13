import { DataSource, Repository } from "typeorm";

import {
  seedActivityFile,
  seedCategoryFile,
  seedLanguageInUseFile,
  seedSkillFile,
} from "../../config/constants";
import FieldTranslation from "../entity/field_translation.entity";
import Language from "../entity/language.entity";
import Activity from "../entity/profile/activity.entity";
import Category from "../entity/profile/category.entity";
import Skill from "../entity/profile/skill.entity";
import { readJsonAsync } from "../utils";

const entityLanguageName = "Language";
const entityCategoryName = "Category";
const entityActivityName = "Activity";
const entitySkillName = "Skill";
const fieldNameTitle = "title";
const fieldNameDescription = "description";
const isoCodeEN = "en";
const isoCodeDE = "de";

interface ContentEnDe {
  en: string;
  de: string;
}

interface OptionJSON {
  id: string;
  title: ContentEnDe;
  description?: ContentEnDe;
}

async function seedLanguagesInUse(
  fieldTranslationRepository: Repository<FieldTranslation>,
  languageRepository: Repository<Language>,
  langEN: Language,
  langDE: Language,
) {
  const languagesTranslations = (await readJsonAsync(
    seedLanguageInUseFile,
  )) as OptionJSON[];

  const existingLanguageTranslations = await fieldTranslationRepository.find({
    where: { entityName: entityLanguageName },
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
    if (!existingLanguageTranslationsSet.has(`${isoCodeEN}_${en}`)) {
      const language = await languageRepository.findOne({
        where: { isoCode },
      });
      if (language) {
        const translationEN = new FieldTranslation();
        translationEN.translation = en;
        translationEN.entityName = entityLanguageName;
        translationEN.entityId = language.id;
        translationEN.languageId = langEN.id;
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
        translationDE.languageId = langDE.id;
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

async function seedCategories(
  fieldTranslationRepository: Repository<FieldTranslation>,
  categoryRepository: Repository<Category>,
  langEN: Language,
  langDE: Language,
) {
  const categoryTranslations = (await readJsonAsync(
    seedCategoryFile,
  )) as OptionJSON[];

  const categories = await categoryRepository.find();
  if (!categories.length) {
    throw new Error("Categories not loaded yet.");
  }

  const existingCategoryTranslations = await fieldTranslationRepository.find({
    where: { entityName: entityCategoryName },
    relations: ["language"],
  });

  const existingCategoryTranslationsSet = new Set(
    existingCategoryTranslations
      ? existingCategoryTranslations.map(
          (translation) =>
            `${translation.language.isoCode}_${translation.entityId}_${translation.fieldName}`,
        )
      : [],
  );

  const translationsForInsert: FieldTranslation[] = [];
  for (const translation of categoryTranslations) {
    const { id, title, description } = translation;
    const category = categories.find((_category) => _category.title === id);
    if (
      !existingCategoryTranslationsSet.has(
        `${isoCodeEN}_${category.id}_${fieldNameTitle}`,
      )
    ) {
      const newTranslation = new FieldTranslation();
      newTranslation.translation = title.en;
      newTranslation.entityName = entityCategoryName;
      newTranslation.entityId = category.id;
      newTranslation.languageId = langEN.id;
      translationsForInsert.push(newTranslation);
    }
    if (
      !existingCategoryTranslationsSet.has(
        `${isoCodeDE}_${category.id}_${fieldNameTitle}`,
      )
    ) {
      const newTranslation = new FieldTranslation();
      newTranslation.translation = title.de;
      newTranslation.entityName = entityCategoryName;
      newTranslation.entityId = category.id;
      newTranslation.languageId = langDE.id;
      translationsForInsert.push(newTranslation);
    }
    if (
      !existingCategoryTranslationsSet.has(
        `${isoCodeEN}_${category.id}_${fieldNameDescription}`,
      )
    ) {
      const newTranslation = new FieldTranslation();
      newTranslation.fieldName = fieldNameDescription;
      newTranslation.translation = description.en;
      newTranslation.entityName = entityCategoryName;
      newTranslation.entityId = category.id;
      newTranslation.languageId = langEN.id;
      translationsForInsert.push(newTranslation);
    }
    if (
      !existingCategoryTranslationsSet.has(
        `${isoCodeDE}_${category.id}_${fieldNameDescription}`,
      )
    ) {
      const newTranslation = new FieldTranslation();
      newTranslation.fieldName = fieldNameDescription;
      newTranslation.translation = description.de;
      newTranslation.entityName = entityCategoryName;
      newTranslation.entityId = category.id;
      newTranslation.languageId = langDE.id;
      translationsForInsert.push(newTranslation);
    }
  }

  try {
    await fieldTranslationRepository.insert(translationsForInsert);
  } catch (error) {
    throw new Error(`Error inserting category translations: ${error.message}`);
  }
}

async function seedActivities(
  fieldTranslationRepository: Repository<FieldTranslation>,
  activityRepository: Repository<Activity>,
  langEN: Language,
  langDE: Language,
) {
  const activities = await activityRepository.find();

  const activityTranslations = (await readJsonAsync(
    seedActivityFile,
  )) as OptionJSON[];

  const existingActivities = await fieldTranslationRepository.find({
    where: { entityName: entityActivityName },
    relations: ["language"],
  });

  const existingActivityTranslationsSet = new Set(
    existingActivities
      ? existingActivities.map(
          (translation) =>
            `${translation.language.isoCode}_${translation.translation}`,
        )
      : [],
  );

  const translationsForInsert: FieldTranslation[] = [];
  for (const activityTranslation of activityTranslations) {
    const {
      id,
      title: { en, de },
    } = activityTranslation;

    const activity = activities.find((_activity) => _activity.title === id);

    if (!existingActivityTranslationsSet.has(`${isoCodeEN}_${en}`)) {
      const translationEN = new FieldTranslation();
      translationEN.translation = en;
      translationEN.entityName = entityActivityName;
      translationEN.entityId = activity.id;
      translationEN.languageId = langEN.id;
      translationsForInsert.push(translationEN);
    }

    if (!existingActivityTranslationsSet.has(`${isoCodeDE}_${de}`)) {
      const translationDE = new FieldTranslation();
      translationDE.translation = de;
      translationDE.entityName = entityActivityName;
      translationDE.entityId = activity.id;
      translationDE.languageId = langDE.id;
      translationsForInsert.push(translationDE);
    }
  }

  try {
    await fieldTranslationRepository.insert(translationsForInsert);
  } catch (error) {
    throw new Error(`Error inserting activity translations: ${error.message}`);
  }
}

async function seedSkills(
  fieldTranslationRepository: Repository<FieldTranslation>,
  skillRepository: Repository<Skill>,
  langEN: Language,
  langDE: Language,
) {
  const skills = await skillRepository.find();

  const skillTranslations = (await readJsonAsync(
    seedSkillFile,
  )) as OptionJSON[];

  const existingSkills = await fieldTranslationRepository.find({
    where: { entityName: entitySkillName },
    relations: ["language"],
  });

  const existingSkillTranslationsSet = new Set(
    existingSkills
      ? existingSkills.map(
          (translation) =>
            `${translation.language.isoCode}_${translation.translation}`,
        )
      : [],
  );

  const translationsForInsert: FieldTranslation[] = [];
  for (const skillTranslation of skillTranslations) {
    const {
      id,
      title: { en, de },
    } = skillTranslation;

    const skill = skills.find((_skill) => _skill.title === id);

    if (!existingSkillTranslationsSet.has(`${isoCodeEN}_${en}`)) {
      const translationEN = new FieldTranslation();
      translationEN.translation = en;
      translationEN.entityName = entitySkillName;
      translationEN.entityId = skill.id;
      translationEN.languageId = langEN.id;
      translationsForInsert.push(translationEN);
    }

    if (!existingSkillTranslationsSet.has(`${isoCodeDE}_${de}`)) {
      const translationDE = new FieldTranslation();
      translationDE.translation = de;
      translationDE.entityName = entitySkillName;
      translationDE.entityId = skill.id;
      translationDE.languageId = langDE.id;
      translationsForInsert.push(translationDE);
    }
  }

  try {
    await fieldTranslationRepository.insert(translationsForInsert);
  } catch (error) {
    throw new Error(`Error inserting skill translations: ${error.message}`);
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

  const categoryRepository = dataSource.getRepository(Category);
  await seedCategories(
    fieldTranslationRepository,
    categoryRepository,
    langEN,
    langDE,
  );

  const activityRepository = dataSource.getRepository(Activity);
  await seedActivities(
    fieldTranslationRepository,
    activityRepository,
    langEN,
    langDE,
  );

  const skillRepository = dataSource.getRepository(Skill);
  await seedSkills(fieldTranslationRepository, skillRepository, langEN, langDE);
}

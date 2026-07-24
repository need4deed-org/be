import { EntityTableName } from "need4deed-sdk";
import { DataSource, Repository } from "typeorm";
import {
  seedActivityFile,
  seedCategoryFile,
  seedLanguageInUseFile,
  seedLeadFromFile,
  seedSkillFile,
} from "../../../config/constants";
import logger from "../../../logger";
import FieldTranslation from "../../entity/field_translation.entity";
import LeadFrom from "../../entity/lead.entity";
import Activity from "../../entity/profile/activity.entity";
import AgentType from "../../entity/profile/agent-type.entity";
import Category from "../../entity/profile/category.entity";
import Language from "../../entity/profile/language.entity";
import Service from "../../entity/profile/service.entity";
import Skill from "../../entity/profile/skill.entity";
import { fetchJsonFromUrl, getRepository } from "../../utils";
import { getCount } from "../utils";

// Same values as the AddAgentTypeAndService migration's field_translation
// seed — duplicated (not imported/shared) because that migration must stay
// self-contained. This is the dev/test bootstrap's fallback path: on a fresh
// DB, migrations run before `language` is seeded, so the migration's own
// insert seeds 0 rows there; this backfills once `language` definitely
// exists. On any already-migrated environment (where `language` predates
// this migration), the migration's insert already did the job and
// seedFieldTranslation's count!==0 guard skips this entirely.
const AGENT_TYPE_TRANSLATIONS: Record<string, ContentEnDe> = {
  AE: { en: "Reception facility", de: "Aufnahmeeinrichtung" },
  GU1: { en: "shared accommodation 1", de: "Gemeinschaftsunterkunft 1" },
  GU2: { en: "shared accommodation 2", de: "Gemeinschaftsunterkunft 2" },
  // GU2+ has no row of its own in the source data — reuses GU2's
  // translations with "+" appended, per product direction.
  "GU2+": { en: "shared accommodation 2+", de: "Gemeinschaftsunterkunft 2+" },
  GU3: { en: "shared accommodation 3", de: "Gemeinschaftsunterkunft 3" },
  NU: { en: "Emergency shelter", de: "Notunterkunft" },
  ASOG: { en: "accommodation with no social support", de: "ASOG" },
  "S/U": { en: "School", de: "Schule/Uni" },
  jobcenter: { en: "Jobcenter", de: "Jobcenter" },
  arzt: { en: "Doctor", de: "Arzt" },
  "counseling-center": { en: "consultation center", de: "Beratungsstelle" },
  tandem: { en: "Tandem", de: "Tandem" },
  "multiple-social-support": {
    en: "multiple social support",
    de: "Mehrere Soziale Leistungen",
  },
};

const SERVICE_TRANSLATIONS: Record<string, ContentEnDe> = {
  childcare: { en: "childcare", de: "Kinderbetreuung" },
  welfare: { en: "welfare", de: "Sozialhilfe" },
  health: { en: "Health", de: "Gesundheit" },
  consultation: { en: "consultation", de: "Beratung" },
  "voluntary-support": { en: "voluntary-support", de: "Freiwilligenhilfe" },
  tandem: { en: "tandem", de: "Tandem" },
  sport: { en: "sport", de: "Sport" },
  tutoring: { en: "tutoring", de: "Nachhilfe" },
  "refugee-accommodation": {
    en: "refugee-accommodation",
    de: "Flüchtlingsunterkunft",
  },
  "job-coaching": { en: "job-coaching", de: "Jobcoaching" },
  youth: { en: "youth", de: "Jugendarbeit" },
  education: { en: "Education", de: "Bildung" },
};

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
  const languagesTranslations = (await fetchJsonFromUrl(
    seedLanguageInUseFile,
  )) as OptionJSON[];

  const existingLanguageTranslations = await fieldTranslationRepository.find({
    where: { entityType: EntityTableName.LANGUAGE },
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
        translationEN.entityType = EntityTableName.LANGUAGE;
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
        translationDE.entityType = EntityTableName.LANGUAGE;
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
  const categoryTranslations = (await fetchJsonFromUrl(
    seedCategoryFile,
  )) as OptionJSON[];

  const categories = await categoryRepository.find();
  if (!categories.length) {
    throw new Error("Categories not loaded yet.");
  }

  const existingCategoryTranslations = await fieldTranslationRepository.find({
    where: { entityType: EntityTableName.CATEGORY },
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
      newTranslation.entityType = EntityTableName.CATEGORY;
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
      newTranslation.entityType = EntityTableName.CATEGORY;
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
      newTranslation.entityType = EntityTableName.CATEGORY;
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
      newTranslation.entityType = EntityTableName.CATEGORY;
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

  const activityTranslations = (await fetchJsonFromUrl(
    seedActivityFile,
  )) as OptionJSON[];

  const existingActivities = await fieldTranslationRepository.find({
    where: { entityType: EntityTableName.ACTIVITY },
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
      translationEN.entityType = EntityTableName.ACTIVITY;
      translationEN.entityId = activity.id;
      translationEN.languageId = langEN.id;
      translationsForInsert.push(translationEN);
    }

    if (!existingActivityTranslationsSet.has(`${isoCodeDE}_${de}`)) {
      const translationDE = new FieldTranslation();
      translationDE.translation = de;
      translationDE.entityType = EntityTableName.ACTIVITY;
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

  const skillTranslations = (await fetchJsonFromUrl(
    seedSkillFile,
  )) as OptionJSON[];

  const existingSkills = await fieldTranslationRepository.find({
    where: { entityType: EntityTableName.SKILL },
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

    if (!existingSkillTranslationsSet.has(`${isoCodeDE}_${de}`)) {
      const translationDE = new FieldTranslation();
      translationDE.translation = de;
      translationDE.entityType = EntityTableName.SKILL;
      translationDE.entityId = skill.id;
      translationDE.languageId = langDE.id;
      translationsForInsert.push(translationDE);
    }

    if (!existingSkillTranslationsSet.has(`${isoCodeEN}_${en}`)) {
      const translationEN = new FieldTranslation();
      translationEN.translation = en;
      translationEN.entityType = EntityTableName.SKILL;
      translationEN.entityId = skill.id;
      translationEN.languageId = langEN.id;
      translationsForInsert.push(translationEN);
    }
  }

  try {
    await fieldTranslationRepository.insert(translationsForInsert);
  } catch (error) {
    throw new Error(`Error inserting activity translations: ${error.message}`);
  }
}

async function seedAgentTypes(
  fieldTranslationRepository: Repository<FieldTranslation>,
  agentTypeRepository: Repository<AgentType>,
  langEN: Language,
  langDE: Language,
) {
  const agentTypes = await agentTypeRepository.find();

  const existingAgentTypeTranslations = await fieldTranslationRepository.find({
    where: { entityType: EntityTableName.AGENT_TYPE },
    relations: ["language"],
  });

  const existingAgentTypeTranslationsSet = new Set(
    existingAgentTypeTranslations.map(
      (translation) =>
        `${translation.language.isoCode}_${translation.entityId}`,
    ),
  );

  const translationsForInsert: FieldTranslation[] = [];
  for (const agentType of agentTypes) {
    const translation = AGENT_TYPE_TRANSLATIONS[agentType.title];
    if (!translation) {
      continue;
    }

    if (!existingAgentTypeTranslationsSet.has(`${isoCodeEN}_${agentType.id}`)) {
      const translationEN = new FieldTranslation();
      translationEN.translation = translation.en;
      translationEN.entityType = EntityTableName.AGENT_TYPE;
      translationEN.entityId = agentType.id;
      translationEN.languageId = langEN.id;
      translationsForInsert.push(translationEN);
    }

    if (!existingAgentTypeTranslationsSet.has(`${isoCodeDE}_${agentType.id}`)) {
      const translationDE = new FieldTranslation();
      translationDE.translation = translation.de;
      translationDE.entityType = EntityTableName.AGENT_TYPE;
      translationDE.entityId = agentType.id;
      translationDE.languageId = langDE.id;
      translationsForInsert.push(translationDE);
    }
  }

  try {
    await fieldTranslationRepository.insert(translationsForInsert);
  } catch (error) {
    throw new Error(
      `Error inserting agent type translations: ${error.message}`,
    );
  }
}

async function seedServices(
  fieldTranslationRepository: Repository<FieldTranslation>,
  serviceRepository: Repository<Service>,
  langEN: Language,
  langDE: Language,
) {
  const services = await serviceRepository.find();

  const existingServiceTranslations = await fieldTranslationRepository.find({
    where: { entityType: EntityTableName.SERVICE },
    relations: ["language"],
  });

  const existingServiceTranslationsSet = new Set(
    existingServiceTranslations.map(
      (translation) =>
        `${translation.language.isoCode}_${translation.entityId}`,
    ),
  );

  const translationsForInsert: FieldTranslation[] = [];
  for (const service of services) {
    const translation = SERVICE_TRANSLATIONS[service.title];
    if (!translation) {
      continue;
    }

    if (!existingServiceTranslationsSet.has(`${isoCodeEN}_${service.id}`)) {
      const translationEN = new FieldTranslation();
      translationEN.translation = translation.en;
      translationEN.entityType = EntityTableName.SERVICE;
      translationEN.entityId = service.id;
      translationEN.languageId = langEN.id;
      translationsForInsert.push(translationEN);
    }

    if (!existingServiceTranslationsSet.has(`${isoCodeDE}_${service.id}`)) {
      const translationDE = new FieldTranslation();
      translationDE.translation = translation.de;
      translationDE.entityType = EntityTableName.SERVICE;
      translationDE.entityId = service.id;
      translationDE.languageId = langDE.id;
      translationsForInsert.push(translationDE);
    }
  }

  try {
    await fieldTranslationRepository.insert(translationsForInsert);
  } catch (error) {
    throw new Error(`Error inserting service translations: ${error.message}`);
  }
}

async function seedLeeds(
  fieldTranslationRepository: Repository<FieldTranslation>,
  leadFromRepository: Repository<LeadFrom>,
  langEN: Language,
  langDE: Language,
) {
  const leads = await leadFromRepository.find();

  const leadTranslations = (await fetchJsonFromUrl(
    seedLeadFromFile,
  )) as OptionJSON[];

  const existingLeads = await fieldTranslationRepository.find({
    where: { entityType: EntityTableName.LEAD },
    relations: ["language"],
  });

  const existingLeadFromTranslationsSet = new Set(
    existingLeads
      ? existingLeads.map(
          (translation) =>
            `${translation.language.isoCode}_${translation.translation}`,
        )
      : [],
  );

  const translationsForInsert: FieldTranslation[] = [];
  for (const skillTranslation of leadTranslations) {
    const {
      id,
      title: { en, de },
    } = skillTranslation;

    const lead = leads.find((_lead) => _lead.title === id);

    if (!existingLeadFromTranslationsSet.has(`${isoCodeEN}_${en}`)) {
      const translationEN = new FieldTranslation();
      translationEN.translation = en;
      translationEN.entityType = EntityTableName.LEAD;
      translationEN.entityId = lead.id;
      translationEN.languageId = langEN.id;
      translationsForInsert.push(translationEN);
    }

    if (!existingLeadFromTranslationsSet.has(`${isoCodeDE}_${de}`)) {
      const translationDE = new FieldTranslation();
      translationDE.translation = de;
      translationDE.entityType = EntityTableName.LEAD;
      translationDE.entityId = lead.id;
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

  const fieldTranslationRepository = getRepository(
    dataSource,
    FieldTranslation,
  );

  const count = await getCount(fieldTranslationRepository);
  if (count !== 0) {
    logger.info("Skipping seeding translations.");
    return;
  }

  const languageRepository = getRepository(dataSource, Language);

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

  const categoryRepository = getRepository(dataSource, Category);
  await seedCategories(
    fieldTranslationRepository,
    categoryRepository,
    langEN,
    langDE,
  );

  const activityRepository = getRepository(dataSource, Activity);
  await seedActivities(
    fieldTranslationRepository,
    activityRepository,
    langEN,
    langDE,
  );

  const skillRepository = getRepository(dataSource, Skill);
  await seedSkills(fieldTranslationRepository, skillRepository, langEN, langDE);

  const leadFromRepository = getRepository(dataSource, LeadFrom);
  await seedLeeds(
    fieldTranslationRepository,
    leadFromRepository,
    langEN,
    langDE,
  );

  const agentTypeRepository = getRepository(dataSource, AgentType);
  await seedAgentTypes(
    fieldTranslationRepository,
    agentTypeRepository,
    langEN,
    langDE,
  );

  const serviceRepository = getRepository(dataSource, Service);
  await seedServices(
    fieldTranslationRepository,
    serviceRepository,
    langEN,
    langDE,
  );
}

import { DataSource, In, Repository } from "typeorm";

import { seedLanguageInUseFile } from "../../config/constants";
import LeadFrom from "../entity/lead.entity";
import District from "../entity/location/district.entity";
import Option from "../entity/option.entity";
import Activity from "../entity/profile/activity.entity";
import Language from "../entity/profile/language.entity";
import Skill from "../entity/profile/skill.entity";
import { TranslationEntityType } from "../types";
import { readJsonAsync } from "../utils";
import { getCount, getRepository } from "./utils";

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

async function getOptionsForLanguagesInUse(
  optionRepository: Repository<Option>,
  languageRepository: Repository<Language>,
) {
  const languagesTranslations = (await readJsonAsync(
    seedLanguageInUseFile,
  )) as OptionJSON[];

  const existingLanguageOptions = await optionRepository.find({
    where: { itemType: TranslationEntityType.LANGUAGE },
  });

  const existingLanguageOptionsSet = new Set(
    existingLanguageOptions
      ? existingLanguageOptions.map(({ itemId }) => itemId)
      : [],
  );

  const languageIsoCodesInUse = languagesTranslations.map(({ id }) => id);
  const languagesInUse = await languageRepository.find({
    where: { isoCode: In(languageIsoCodesInUse) },
  });
  const optionsForInsert: Option[] = [];

  for (const languageInUse of languagesInUse) {
    if (!existingLanguageOptionsSet.has(languageInUse.id)) {
      const newOption = new Option({
        itemType: TranslationEntityType.LANGUAGE,
        itemId: languageInUse.id,
      });
      optionsForInsert.push(newOption);
    }
  }

  return optionsForInsert;
}

type OptionEntity =
  | typeof Activity
  | typeof District
  | typeof LeadFrom
  | typeof Skill;

async function getOptionsForEntity<E extends OptionEntity>(
  dataSource: DataSource,
  optionRepository: Repository<Option>,
  entity: E,
) {
  const entityRepository = getRepository(
    dataSource,
    entity as new () => InstanceType<E>,
  );
  // const itemType = entity.name.toLowerCase() as TranslationEntityType;
  const itemType = dataSource.getMetadata(entity)
    .tableName as TranslationEntityType;
  const items = await entityRepository.find();
  if (!items.length) {
    throw new Error(`${entity.name} not loaded yet.`);
  }

  const existingOptions = await optionRepository.find({
    where: { itemType },
  });

  const existingOptionsSet = new Set(
    existingOptions ? existingOptions.map(({ itemId }) => itemId) : [],
  );

  const optionsForInsert: Option[] = [];
  for (const item of items) {
    const { id } = item;
    if (!existingOptionsSet.has(id)) {
      const option = new Option({
        itemType,
        itemId: item.id,
      });
      optionsForInsert.push(option);
    }
  }

  return optionsForInsert;
}

// async function getOptionsForDistricts(
//   optionRepository: Repository<Option>,
//   districtRepository: Repository<District>,
// ) {
//   const districts = await districtRepository.find();
//   if (!districts.length) {
//     throw new Error("Districts not loaded yet.");
//   }

//   const existingDistrictOptions = await optionRepository.find({
//     where: { itemType: TranslationEntityType.DISTRICT },
//   });

//   const existingDistrictOptionsSet = new Set(
//     existingDistrictOptions
//       ? existingDistrictOptions.map(({ itemId }) => itemId)
//       : [],
//   );

//   const optionsForInsert: Option[] = [];
//   for (const district of districts) {
//     const { id } = district;
//     if (!existingDistrictOptionsSet.has(id)) {
//       const option = new Option({
//         itemType: TranslationEntityType.CATEGORY,
//         itemId: district.id,
//       });
//       optionsForInsert.push(option);
//     }
//   }

//   return optionsForInsert;
// }

// async function getOptionsForCategories(
//   optionRepository: Repository<Option>,
//   categoryRepository: Repository<Category>,
// ) {
//   const categories = await categoryRepository.find();
//   if (!categories.length) {
//     throw new Error("Categories not loaded yet.");
//   }

//   const existingCategoryOptions = await optionRepository.find({
//     where: { itemType: TranslationEntityType.CATEGORY },
//   });

//   const existingCategoryOptionsSet = new Set(
//     existingCategoryOptions
//       ? existingCategoryOptions.map(({ itemId }) => itemId)
//       : [],
//   );

//   const optionsForInsert: Option[] = [];
//   for (const category of categories) {
//     const { id } = category;
//     if (!existingCategoryOptionsSet.has(id)) {
//       const option = new Option({
//         itemType: TranslationEntityType.CATEGORY,
//         itemId: category.id,
//       });
//       optionsForInsert.push(option);
//     }
//   }

//   return optionsForInsert;
// }

// async function getOptionsForActivities(
//   optionRepository: Repository<Option>,
//   activityRepository: Repository<Activity>,
// ) {
//   const activities = await activityRepository.find();
//   if (!activities.length) {
//     throw new Error("Activities not loaded yet.");
//   }

//   const existingActivityOptions = await optionRepository.find({
//     where: { itemType: TranslationEntityType.ACTIVITY },
//   });

//   const existingActivityOptionsSet = new Set(
//     existingActivityOptions
//       ? existingActivityOptions.map(({ itemId }) => itemId)
//       : [],
//   );

//   const optionsForInsert: Option[] = [];
//   for (const activity of activities) {
//     const { id } = activity;
//     if (!existingActivityOptionsSet.has(id)) {
//       const option = new Option({
//         itemType: TranslationEntityType.ACTIVITY,
//         itemId: activity.id,
//       });
//       optionsForInsert.push(option);
//     }
//   }

//   return optionsForInsert;
// }

// async function getOptionsForSkills(
//   optionRepository: Repository<Option>,
//   skillRepository: Repository<Skill>,
// ) {
//   const skills = await skillRepository.find();
//   if (!skills.length) {
//     throw new Error("Skills not loaded yet.");
//   }

//   const existingSkillOptions = await optionRepository.find({
//     where: { itemType: TranslationEntityType.SKILL },
//   });

//   const existingSkillOptionsSet = new Set(
//     existingSkillOptions
//       ? existingSkillOptions.map(({ itemId }) => itemId)
//       : [],
//   );

//   const optionsForInsert: Option[] = [];
//   for (const skill of skills) {
//     const { id } = skill;
//     if (!existingSkillOptionsSet.has(id)) {
//       const option = new Option({
//         itemType: TranslationEntityType.ACTIVITY,
//         itemId: skill.id,
//       });
//       optionsForInsert.push(option);
//     }
//   }

//   return optionsForInsert;
// }

// async function getOptionsForLeeds(
//   optionRepository: Repository<Option>,
//   leadFromRepository: Repository<LeadFrom>,
// ) {
//   const leads = await leadFromRepository.find();
//   if (!leads.length) {
//     throw new Error("Leads form not loaded yet.");
//   }

//   const existingLeadOptions = await optionRepository.find({
//     where: { itemType: TranslationEntityType.LEAD },
//   });

//   const existingLeadOptionsSet = new Set(
//     existingLeadOptions ? existingLeadOptions.map(({ itemId }) => itemId) : [],
//   );

//   const optionsForInsert: Option[] = [];
//   for (const lead of leads) {
//     const { id } = lead;
//     if (!existingLeadOptionsSet.has(id)) {
//       const option = new Option({
//         itemType: TranslationEntityType.LEAD,
//         itemId: lead.id,
//       });
//       optionsForInsert.push(option);
//     }
//   }

//   return optionsForInsert;
// }

export async function seedOptions(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const optionRepository = getRepository(dataSource, Option);

  const count = await getCount(optionRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding options.");
    return;
  }

  const optionsForInsert: Option[][] = [];

  const languageRepository = getRepository(dataSource, Language);
  optionsForInsert.push(
    await getOptionsForLanguagesInUse(optionRepository, languageRepository),
  );

  for (const entity of [
    Activity,
    District,
    LeadFrom,
    Skill,
  ] as OptionEntity[]) {
    optionsForInsert.push(
      await getOptionsForEntity(dataSource, optionRepository, entity),
    );
  }
  // const districtRepository = dataSource.getRepository(District);
  // optionsForInsert.push(
  //   await getOptionsForDistricts(optionRepository, districtRepository),
  // );

  // const categoryRepository = dataSource.getRepository(Category);
  // optionsForInsert.push(
  //   await getOptionsForCategories(optionRepository, categoryRepository),
  // );

  // const activityRepository = dataSource.getRepository(Activity);
  // optionsForInsert.push(
  //   await getOptionsForActivities(optionRepository, activityRepository),
  // );

  // const skillRepository = dataSource.getRepository(Skill);
  // optionsForInsert.push(
  //   await getOptionsForSkills(optionRepository, skillRepository),
  // );

  // const leadFromRepository = dataSource.getRepository(LeadFrom);
  // optionsForInsert.push(
  //   await getOptionsForLeeds(optionRepository, leadFromRepository),
  // );

  try {
    await optionRepository.insert(optionsForInsert.flat());
  } catch (error) {
    throw new Error(`Error inserting skill translations: ${error.message}`);
  }
}

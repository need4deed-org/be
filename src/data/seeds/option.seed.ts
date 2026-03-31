import { EntityTableName } from "need4deed-sdk";
import { DataSource, In, Repository } from "typeorm";
import { seedLanguageInUseFile } from "../../config/constants";
import logger from "../../logger";
import LeadFrom from "../entity/lead.entity";
import District from "../entity/location/district.entity";
import Option from "../entity/option.entity";
import Activity from "../entity/profile/activity.entity";
import Language from "../entity/profile/language.entity";
import Skill from "../entity/profile/skill.entity";
import { fetchJsonFromUrl, getRepository } from "../utils";
import { getCount } from "./utils";

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
  const languagesTranslations = (await fetchJsonFromUrl(
    seedLanguageInUseFile,
  )) as OptionJSON[];

  const existingLanguageOptions = await optionRepository.find({
    where: { itemType: EntityTableName.LANGUAGE },
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
        itemType: EntityTableName.LANGUAGE,
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
  const itemType = dataSource.getMetadata(entity).tableName as EntityTableName;
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

export async function seedOptions(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const optionRepository = getRepository(dataSource, Option);

  const count = await getCount(optionRepository);
  if (count !== 0) {
    logger.info("Skipping seeding options.");
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

  try {
    await optionRepository.insert(optionsForInsert.flat());
  } catch (error) {
    throw new Error(`Error inserting skill translations: ${error.message}`);
  }
}

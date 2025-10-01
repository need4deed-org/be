import { Lang } from "need4deed-sdk";
import { In, Repository } from "typeorm";
import { AppDataSource as dataSource } from "../../data/data-source";
import FieldTranslation from "../../data/entity/field_translation.entity";
import District from "../../data/entity/location/district.entity";
import Postcode from "../../data/entity/location/postcode.entity";
import Option from "../../data/entity/option.entity";
import Language from "../../data/entity/profile/language.entity";
import Timeslot from "../../data/entity/time/timeslot.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../data/seeds/utils";
import { TranslationEntityType } from "../../data/types";

export async function getPostcode(code: string): Promise<Postcode | null> {
  const postcodeRepository = getRepository(dataSource, Postcode);

  let postcode = await postcodeRepository.findOneBy({ value: code });

  if (!postcode) {
    postcode = new Postcode({ value: code });
    await postcodeRepository.save(postcode);
  }

  return postcode;
}

export async function getProfileEntityByTitle<
  E extends new () => { title: string; id: number },
  M extends object,
>(
  entityTitle: string,
  entityType: TranslationEntityType,
  entity: E,
  m2mEntity: new (args: unknown) => M,
  key?: keyof M,
): Promise<M | null> {
  const instance = await getInstanceByTranslation(
    entityTitle,
    entity,
    entityType,
  );

  if (instance) {
    const profileEntity = new m2mEntity({
      [key ? key : entityType.toLowerCase()]: instance,
    });

    return profileEntity;
  }

  return null;
}

export async function getTimeslot(
  timeslotData: Partial<Timeslot>,
): Promise<Timeslot> {
  const timeslotRepository = getRepository(dataSource, Timeslot);

  let timeslot = await timeslotRepository.findOneBy(timeslotData);
  if (!timeslot) {
    timeslot = new Timeslot(timeslotData);
  }

  return timeslot;
}

export async function getInstanceByTranslation<
  E extends new () => { id: number; title: string },
>(
  entityTitle: string,
  entity: E,
  entityType: TranslationEntityType,
): Promise<InstanceType<E> | null> {
  const repository = getRepository(dataSource, entity);
  let instance = await repository.findOneBy({ title: entityTitle });
  if (!instance && entityType !== TranslationEntityType.NONE) {
    const fieldTranslationRepository = getRepository(
      dataSource,
      FieldTranslation,
    );

    const translation = await fieldTranslationRepository.findOne({
      where: {
        entityType: entityType,
        translation: entityTitle,
      },
    });
    if (translation) {
      instance = await repository.findOneBy({
        id: translation.entityId,
      });
    }
  }

  if (instance) {
    return instance as InstanceType<E>;
  }

  return null;
}

export async function addTranslatedFields(
  volunteers: Volunteer[],
  isoCode: Lang,
) {
  let language: Language;
  let languageRepository: Repository<Language>;
  let fieldTranslationRepository: Repository<FieldTranslation>;
  try {
    fieldTranslationRepository = getRepository(dataSource, FieldTranslation);
    languageRepository = getRepository(dataSource, Language);
    language = await languageRepository.findOne({ where: { isoCode } });
    if (!language) {
      throw new Error(`Language ${isoCode} not found.`);
    }
  } catch (error) {
    dataSource.logger.log("warn", `Error loading language: ${error}`);
    throw new Error(error.message);
  }
  dataSource.logger.log("log", "Translating volunteers");
  for (const volunteer of volunteers) {
    for (const pl of volunteer.deal.profile.profileLanguage) {
      const translation = await fieldTranslationRepository.findOne({
        where: {
          language,
          entityType: TranslationEntityType.LANGUAGE,
          entityId: pl.language.id,
        },
      });
      pl.language.translation = translation?.translation
        ? translation?.translation
        : pl.language.translation;
    }
    for (const pa of volunteer.deal.profile.profileActivity) {
      const translation = await fieldTranslationRepository.findOne({
        where: {
          language,
          entityType: TranslationEntityType.ACTIVITY,
          entityId: pa.activity.id,
        },
      });
      pa.activity.translation = translation?.translation
        ? translation?.translation
        : pa.activity.translation;
    }
    for (const ps of volunteer.deal.profile.profileSkill) {
      const translation = await fieldTranslationRepository.findOne({
        where: {
          language,
          entityType: TranslationEntityType.SKILL,
          entityId: ps.skill.id,
        },
      });
      ps.skill.translation = translation?.translation
        ? translation?.translation
        : ps.skill.translation;
    }
  }
}

export async function getOptions(
  list: TranslationEntityType | undefined,
  language: Lang,
): Promise<
  Partial<Record<TranslationEntityType, { title: string; id: number }[]>>
> {
  const optionRepository = getRepository(dataSource, Option);
  const fieldTranslationRepository = getRepository(
    dataSource,
    FieldTranslation,
  );
  const languageRepository = getRepository(dataSource, Language);
  const lang = await languageRepository.findOne({
    where: { isoCode: language },
  });
  if (!lang) {
    throw new Error(`Language ${language} not found.`);
  }
  const languageId = lang.id;

  async function getList(itemType: TranslationEntityType) {
    const options = await optionRepository.find({
      where: { itemType },
    });

    if (
      [
        TranslationEntityType.ACTIVITY,
        TranslationEntityType.LANGUAGE,
        TranslationEntityType.SKILL,
        TranslationEntityType.LEAD,
        TranslationEntityType.CATEGORY,
      ].includes(itemType)
    ) {
      const items = await fieldTranslationRepository.find({
        where: {
          entityType: itemType,
          entityId: In(options.map(({ itemId }) => itemId)),
          fieldName: "title",
          languageId,
        },
      });

      return items.map(({ translation, entityId }) => ({
        title: translation,
        id: entityId,
      }));
    }

    if (itemType === TranslationEntityType.DISTRICT) {
      const districtRepository = getRepository(dataSource, District);
      const items = await districtRepository.find({
        where: {
          id: In(options.map(({ itemId }) => itemId)),
        },
      });

      return items.map(({ title, id }) => ({ title, id }));
    }

    return [];
  }

  if (!list) {
    return {
      [TranslationEntityType.LANGUAGE]: await getList(
        TranslationEntityType.LANGUAGE,
      ),
      [TranslationEntityType.DISTRICT]: await getList(
        TranslationEntityType.DISTRICT,
      ),
      [TranslationEntityType.CATEGORY]: await getList(
        TranslationEntityType.CATEGORY,
      ),
      [TranslationEntityType.ACTIVITY]: await getList(
        TranslationEntityType.ACTIVITY,
      ),
      [TranslationEntityType.SKILL]: await getList(TranslationEntityType.SKILL),
      [TranslationEntityType.LEAD]: await getList(TranslationEntityType.LEAD),
    };
  }

  if (!Object.values(TranslationEntityType).includes(list)) {
    throw new Error(`Unknown list: ${list}`);
  }

  return await { [list]: await getList(list) };
}

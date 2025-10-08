import {
  ApiOptionLists,
  EntityTableName,
  Lang,
  OptionItem,
} from "need4deed-sdk";
import { In, Repository } from "typeorm";

import { AppDataSource as dataSource } from "../../data/data-source";
import FieldTranslation from "../../data/entity/field_translation.entity";
import District from "../../data/entity/location/district.entity";
import Postcode from "../../data/entity/location/postcode.entity";
import Option from "../../data/entity/option.entity";
import Language from "../../data/entity/profile/language.entity";
import Timeslot from "../../data/entity/time/timeslot.entity";
import Timeline from "../../data/entity/timeline.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../data/seeds/utils";

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
  entityType: EntityTableName,
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
  entityType: EntityTableName,
): Promise<InstanceType<E> | null> {
  const repository = getRepository(dataSource, entity);
  let instance = await repository.findOneBy({ title: entityTitle });
  if (!instance && entityType !== EntityTableName.NONE) {
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
          entityType: EntityTableName.LANGUAGE,
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
          entityType: EntityTableName.ACTIVITY,
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
          entityType: EntityTableName.SKILL,
          entityId: ps.skill.id,
        },
      });
      ps.skill.translation = translation?.translation
        ? translation?.translation
        : ps.skill.translation;
    }
  }
}

export async function getTimedEvents(volunteer: Volunteer) {
  const timelineRepository = getRepository(dataSource, Timeline);
  const events = await timelineRepository.find({
    where: {
      targetEntityType: EntityTableName.VOLUNTEER,
      targetEntityId: volunteer.id,
    },
    order: { timestamp: "DESC" },
  });

  return events;
}

export async function getOptions(
  list: EntityTableName | undefined,
  language: Lang,
): Promise<ApiOptionLists> {
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

  async function getList(itemType: EntityTableName): Promise<OptionItem[]> {
    const options = await optionRepository.find({
      where: { itemType },
    });

    if (
      [
        EntityTableName.ACTIVITY,
        EntityTableName.LANGUAGE,
        EntityTableName.SKILL,
        EntityTableName.LEAD,
        EntityTableName.CATEGORY,
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

    if (itemType === EntityTableName.DISTRICT) {
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
      [EntityTableName.LANGUAGE]: await getList(EntityTableName.LANGUAGE),
      [EntityTableName.DISTRICT]: await getList(EntityTableName.DISTRICT),
      [EntityTableName.CATEGORY]: await getList(EntityTableName.CATEGORY),
      [EntityTableName.ACTIVITY]: await getList(EntityTableName.ACTIVITY),
      [EntityTableName.SKILL]: await getList(EntityTableName.SKILL),
      [EntityTableName.LEAD]: await getList(EntityTableName.LEAD),
    };
  }

  if (!Object.values(EntityTableName).includes(list)) {
    throw new Error(`Unknown list: ${list}`);
  }

  return await { [list]: await getList(list) };
}

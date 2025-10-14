import {
  ApiOptionLists,
  ApiVolunteerGet,
  EntityTableName,
  Lang,
  OptionItem,
  VolunteerPatchBodyData,
} from "need4deed-sdk";
import { DataSource, FindOptionsWhere, In, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

import { AppDataSource as dataSource } from "../../data/data-source";
import FieldTranslation from "../../data/entity/field_translation.entity";
import Address from "../../data/entity/location/address.entity";
import District from "../../data/entity/location/district.entity";
import Postcode from "../../data/entity/location/postcode.entity";
import Option from "../../data/entity/option.entity";
import Person from "../../data/entity/person.entity";
import Language from "../../data/entity/profile/language.entity";
import Timeslot from "../../data/entity/time/timeslot.entity";
import Timeline from "../../data/entity/timeline.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../data/seeds/utils";
import { volunteerSerializer } from "../../services";
import {
  getEmptyPropsNull,
  getNullFromEmptyArray,
  stripNullishAttributes,
} from "./common";

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

export function getPatchData(body: VolunteerPatchBodyData) {
  const volunteerData: Partial<Volunteer> = stripNullishAttributes({
    status: body.status,
    infoAbout: body.infoAbout,
    infoExperience: body.infoExperience,
    statusCGC: body.goodConductCertificate,
    statusVaccination: body.measlesVaccination,
    statusEngagement: body.statusEngagement,
    statusCommunication: body.statusCommunication,
    statusAppreciation: body.statusAppreciation,
    statusType: body.statusType,
    statusMatch: body.statusMatch,
    statusCgcProcess: body.statusCgcProcess,
  });
  const personData: Partial<Person> = stripNullishAttributes({
    id: body.person?.id,
    firstName: body.person?.firstName,
    lastName: body.person?.lastName,
    middleName: body.person?.middleName,
    email: body.person?.email,
    phone: body.person?.phone,
  });
  const comments = body.comments;
  const addressData: Partial<Address> = stripNullishAttributes({
    id: body.person?.address?.id,
    street: body.person?.address?.street,
    city: body.person?.address?.city,
  });
  const postcodeData: Partial<Postcode> = stripNullishAttributes({
    id: body.person?.address?.postcode?.id,
    value: body.person?.address?.postcode?.code,
  });

  return {
    ...getEmptyPropsNull({
      volunteerData,
      personData,
      comments,
      addressData,
      postcodeData,
    }),
    languages: getNullFromEmptyArray(body.languages),
    availability: getNullFromEmptyArray(body.availability),
    activities: getNullFromEmptyArray(body.activities),
    skills: getNullFromEmptyArray(body.skills),
    locations: getNullFromEmptyArray(body.locations),
  };
}

export async function patchEntity<E extends { id: number }>(
  entity: new () => E,
  id: number,
  data: Partial<E>,
): Promise<boolean> {
  const repository = getRepository(dataSource, entity);

  return await repository
    .update({ id } as any, data as QueryDeepPartialEntity<E>)
    .then((response) => response.affected === 1);
}

export async function patchAddress(
  addressData: Partial<Address>,
  postcodeData: Partial<Postcode>,
): Promise<boolean> {
  const postcodeRepository = getRepository(dataSource, Postcode);

  const address = { ...addressData } as Address;

  if (postcodeData) {
    if (postcodeData.id) {
      address.postcodeId = postcodeData.id;
    } else if (postcodeData.value) {
      const postcode = await postcodeRepository.findOneBy({
        value: postcodeData.value,
      });
      if (postcode) {
        address.postcodeId = postcode.id;
      }
    }
  }

  return await patchEntity(Address, address.id!, address);
}

function getVolunteerRelationsAndIdFieldName(m2mEntityName: string) {
  const m2mRelationsMap: Record<
    string,
    {
      relations: string[];
      idFieldNames: [
        "profile" | "location" | "time",
        string,
        "language" | "activity" | "skill" | "district" | "timeslot",
        string,
      ];
    }
  > = {
    ProfileLanguage: {
      idFieldNames: ["profile", "profileId", "language", "languageId"],
      relations: ["deal", "deal.profile.profileLanguage"],
    },
    ProfileActivity: {
      idFieldNames: ["profile", "profileId", "activity", "activityId"],
      relations: ["deal", "deal.profile", "deal.profile.profileActivity"],
    },
    ProfileSkill: {
      idFieldNames: ["profile", "profileId", "skill", "skillId"],
      relations: ["deal", "deal.profile", "deal.profile.profileSkill"],
    },
    LocationDistrict: {
      idFieldNames: ["location", "locationId", "district", "districtId"],
      relations: ["deal", "deal.location", "deal.location.locationDistrict"],
    },
    TimeTimeslot: {
      idFieldNames: ["time", "timeId", "timeslot", "timeslotId"],
      relations: ["deal", "deal.time", "deal.time.timeTimeslot"],
    },
  };

  return m2mRelationsMap[m2mEntityName];
}

export async function updateOptionList<
  M extends { id: number },
  L extends { id: number | string },
>(
  volunteerId: number,
  m2mEntity: new (arg?: unknown) => M,
  list: L[],
): Promise<boolean> {
  const {
    relations,
    idFieldNames: [host, hostId, listName, listItemId],
  } = getVolunteerRelationsAndIdFieldName(m2mEntity.name);

  try {
    dataSource.transaction(async (manager) => {
      const volunteerRepository = getRepository(
        manager as unknown as DataSource,
        Volunteer,
      );
      const volunteer = await volunteerRepository.findOne({
        where: { id: volunteerId },
        relations,
      });
      if (!volunteer) {
        return false;
      }
      const m2mRepository = getRepository(
        manager as unknown as DataSource,
        m2mEntity,
      );

      const where = {
        [hostId]: volunteer.deal[host].id,
      } as FindOptionsWhere<M>;
      dataSource.logger.log("log", `DEBUG:where: ${JSON.stringify(where)}`);
      const currentList = await m2mRepository.find({ where });
      if (currentList.length > 0) {
        await m2mRepository.delete(currentList.map(({ id }) => id));
      }

      const newList = list.map((item) => {
        return new m2mEntity({
          [hostId]: volunteer.deal[host].id,
          [listItemId]: item.id,
          ...(listName === "language" // TODO: tech debt here
            ? {
                proficiency: (item as unknown as { proficiency: string })
                  .proficiency,
              }
            : {}),
        });
      });

      await m2mRepository.save(newList);
    });
  } catch (error) {
    dataSource.logger.log(
      "warn",
      `Error updating list: ${m2mEntity.name} for volunteer id=${volunteerId}`,
    );
    return false;
  }

  return true;
}

export async function fetchVolunteerById(
  id: number,
  isoCode: Lang,
  relations: string[],
): Promise<ApiVolunteerGet | null> {
  const volunteerRepository = getRepository(dataSource, Volunteer);

  const volunteer = await volunteerRepository.findOne({
    where: { id },
    relations,
  });

  if (!volunteer) {
    return null;
  }

  addTranslatedFields([volunteer], isoCode);

  const timedEvents = await getTimedEvents(volunteer);

  const data = volunteerSerializer(volunteer, timedEvents);

  return data;
}

import {
  ApiAvailability,
  ApiOptionLists,
  ApiVolunteerGet,
  EntityTableName,
  Lang,
  Occasionally,
  OccasionalType,
  OptionItem,
  SortOrder,
  VolunteerPatchBodyData,
  VolunteerStateTypeType,
} from "need4deed-sdk";
import { DataSource, FindOptionsWhere, In, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Address from "../../../data/entity/location/address.entity";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Option from "../../../data/entity/option.entity";
import Person from "../../../data/entity/person.entity";
import Language from "../../../data/entity/profile/language.entity";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import Timeline from "../../../data/entity/timeline.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/seeds/utils";
import { getRRULE, getStartEnd } from "../../../data/utils";
import { volunteerSerializer } from "../../../services";
import { tryCatch } from "../../../services/utils";
import {
  getEmptyPropsNull,
  getNullFromEmptyArray,
  stripNullishAttributes,
} from "../common";

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
  m2mEntity: new (_args: unknown) => M,
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

export async function getVolunteerComments(volunteer: Volunteer) {
  const commentRepository = getRepository(dataSource, Comment);
  const relations = ["user", "user.person"];
  const comments = await commentRepository.find({
    where: {
      entityType: EntityTableName.VOLUNTEER,
      entityId: volunteer.id,
    },
    order: { updatedAt: "DESC" },
    relations,
  });

  return comments;
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
    preferredCommunicationType: body.preferredCommunicationType,
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
    .update({ id } as FindOptionsWhere<E>, data as QueryDeepPartialEntity<E>)
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

export async function getOrCreateTimeslot(
  availabilityObject: ApiAvailability,
): Promise<Timeslot> {
  const errorMsg = "Invalid availability object to get or create timeslot";

  const { day, daytime } = availabilityObject;
  if (!day || !daytime) {
    throw new Error(errorMsg);
  }

  let payload: FindOptionsWhere<Timeslot> | Partial<Timeslot>;

  const isOccasional = Object.values(Occasionally).includes(
    day as Occasionally,
  );

  if (isOccasional) {
    payload = Object.values(OccasionalType).includes(daytime as OccasionalType)
      ? { occasional: daytime as OccasionalType }
      : null;
  } else {
    const rrule = getRRULE(day);
    const { start, end } = getStartEnd(daytime) || {
      start: null,
      end: null,
    };
    if (rrule && start && end) {
      payload = { rrule, start, end };
    }
  }

  if (!payload) {
    throw new Error(errorMsg);
  }

  const repositoryTimeslot = getRepository(dataSource, Timeslot);
  let timeslot = await repositoryTimeslot.findOne({ where: payload });

  if (timeslot) {
    return timeslot;
  }

  timeslot = new Timeslot({ ...(payload as Partial<Timeslot>) });
  await repositoryTimeslot.save(timeslot);

  return timeslot;
}

export async function updateOptionList<
  M extends { id: number },
  L extends { id: number | string },
>(
  volunteerId: number,
  m2mEntity: new (_args?: unknown) => M,
  list: L[],
): Promise<boolean> {
  const {
    relations,
    idFieldNames: [host, hostId, listName, listItemId],
  } = getVolunteerRelationsAndIdFieldName(m2mEntity.name);

  try {
    await dataSource.transaction(async (manager) => {
      const volunteerRepository = getRepository(
        manager as unknown as DataSource,
        Volunteer,
      );
      const volunteer = await volunteerRepository.findOne({
        where: { id: volunteerId },
        relations,
      });

      if (!volunteer) {
        throw new Error(`Volunteer ${volunteerId} not found`);
      }

      const m2mRepository = getRepository(
        manager as unknown as DataSource,
        m2mEntity,
      );

      const where = {
        [hostId]: volunteer.deal[host].id,
      } as FindOptionsWhere<M>;

      const currentList = await m2mRepository.find({ where });

      if (currentList.length > 0) {
        await m2mRepository.delete(currentList.map(({ id }) => id));
      }

      const newList = list.map((item) => {
        const newItem = new m2mEntity({
          [hostId]: volunteer.deal[host].id,
          [listItemId]: item.id,
          ...(listName === "language" // TODO: tech debt here
            ? {
                proficiency: (item as unknown as { proficiency: string })
                  .proficiency,
              }
            : {}),
        });

        return newItem;
      });

      await m2mRepository.save(newList);
    });

    return true;
  } catch (error) {
    dataSource.logger.log(
      "warn",
      `Error ${error.message} updating list: ${m2mEntity.name} for volunteer id=${volunteerId}`,
    );
    return false;
  }
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
  const comments = await getVolunteerComments(volunteer);

  const data = volunteerSerializer(volunteer, comments, timedEvents);

  return data;
}

export async function getGerman(): Promise<Language> {
  const languageRepository = getRepository(dataSource, Language);
  const [german, error] = await tryCatch(
    languageRepository.findOne({ where: { isoCode: "de" } }),
  );

  if (error) {
    dataSource.logger.log("warn", `Error fetching German language: ${error}`);
  }

  return german;
}

function getAvailabilityForFiltering(
  availabilityQueryParam: string[] | undefined,
) {
  if (!availabilityQueryParam?.length) {
    return;
  }
  const availabilityForFiltering = availabilityQueryParam.reduce(
    (acc, curr) => {
      const [key, value] = curr.split("~");
      switch (key) {
        case "days":
          acc.days.push(value);
          break;
        case "times":
          acc.times.push(value);
          break;
        case "occasional":
          acc.occasional.push(value);
          break;
      }
      return acc;
    },
    { days: [], times: [], occasional: [] },
  );

  return availabilityForFiltering;
}

type InputQuery = { [key: string]: string | string[] };

export function parseQueryParams(rawQuery: InputQuery) {
  const filter: {
    [key: string]: unknown;
  } = {};

  // 1. Reconstruct the nested 'filter' object
  for (const key in rawQuery) {
    if (key.startsWith("filter[")) {
      // Extracts the inner key, e.g., "district" from "filter[district][0]"
      const match = key.match(/filter\[(\w+)\]/);
      if (match) {
        const filterKey = match[1];
        const value = rawQuery[key];

        // Check for array-like keys (e.g., "filter[district][0]")
        if (
          key.match(/\[\d+\]$/) ||
          [
            "district",
            "language",
            "engagement",
            "availability",
            "statusType",
          ].includes(filterKey)
        ) {
          // Extract the index and ensure the value is added to an array
          if (!filter[filterKey]) {
            filter[filterKey] = [];
          }
          // This is simple for demonstration; a robust parser should handle indices
          (filter[filterKey] as unknown[]).push(value);
        } else {
          // Handle simple filter properties (search, accompanying, german)
          filter[filterKey] = value;
        }
      }
    }
  }

  // 2. Type Conversion and Final Structure
  return {
    limit: parseInt(rawQuery.limit as string, 10) || 0,
    page: parseInt(rawQuery.page as string, 10) || 1,
    orderDirection: getOrderDirection(rawQuery.sortOrder as SortOrder),
    language: rawQuery.language,
    filter: {
      accompanying: getPositive(filter.accompanying as string)
        ? VolunteerStateTypeType.ACCOMPANYING
        : undefined,
      german: getPositive(filter.german as string),
      // Simple string properties
      search: filter.search,

      // Array properties
      district: filter.district as string[],
      languages: filter.language as string[],
      statusType: filter.statusType as string[],
      engagement: filter.engagement as string[],
      availability: getAvailabilityForFiltering(
        filter.availability as string[],
      ),
    },
  };
}

function getPositive(arg: string): boolean {
  return (arg ?? false) !== false && arg !== "0"; // makes "" positive while "0" negative
}

export function getOrderDirection(orderDirection: SortOrder): "ASC" | "DESC" {
  if (orderDirection === SortOrder.NewToOld) {
    return "DESC";
  }
  if (orderDirection === SortOrder.OldToNew) {
    return "ASC";
  }

  dataSource.logger.log(
    "warn",
    `Unknown sort order: ${orderDirection}, defaulting to DESC`,
  );
  return "DESC";
}

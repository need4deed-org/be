import {
  ApiAvailability,
  ApiDocumentGet,
  ApiOptionLists,
  ApiVolunteerGet,
  EntityTableName,
  Lang,
  Occasionally,
  OccasionalType,
  OptionItem,
  SortOrder,
  TranslatedIntoType,
  VolunteerStateTypeType,
} from "need4deed-sdk";
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  In,
  QueryFailedError,
  Repository,
} from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { BadRequestError, NotFoundError } from "../../../config";
import { defaultPageSize } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Document from "../../../data/entity/document.entity";
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
import { getRepository, getRRULE, getStartEnd } from "../../../data/utils";
import logger from "../../../logger";
import { volunteerSerializer } from "../../../services";
import { tryCatch } from "../../../services/utils";

export async function getPostcode(code: string): Promise<Postcode | null> {
  const postcodeRepository = getRepository(dataSource, Postcode);

  let postcode = await postcodeRepository.findOneBy({ value: code });

  if (!postcode) {
    postcode = new Postcode({ value: code });
    await postcodeRepository.save(postcode);
  }

  return postcode;
}

export async function getDealEntityByTitle<
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
    const dealEntity = new m2mEntity({
      [key ? key : entityType.toLowerCase()]: instance,
    });

    return dealEntity;
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
    logger.warn(`Error loading language: ${error}`);
    throw new Error(error.message);
  }
  logger.info("Translating volunteers");
  for (const volunteer of volunteers) {
    try {
      for (const pl of volunteer.deal.dealLanguage) {
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
      for (const pa of volunteer.deal.dealActivity) {
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
      for (const ps of volunteer.deal.dealSkill) {
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
    } catch (error) {
      logger.warn(
        `Error occurred while adding translations to a volunteer id:${volunteer.id} ${error}`,
      );
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

export async function patchEntity<E extends { id: number }>(
  entity: new () => E,
  data: Partial<E>,
  entityId?: number,
): Promise<boolean | void> {
  const repository = getRepository(dataSource, entity);

  const id = entityId || data?.id;
  if (!id) {
    throw new BadRequestError("Missing id for object update.");
  }

  return await repository
    .update({ id } as FindOptionsWhere<E>, data as QueryDeepPartialEntity<E>)
    .then((response) => response.affected === 1)
    .catch((error) => {
      if (error instanceof QueryFailedError) {
        throw new BadRequestError(
          `Invalid data for patching:${entity.name} object id:${id}`,
        );
      }
    });
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

  return Boolean(await patchEntity(Address, address));
}

function getDealRelationsAndIdFieldName(m2mEntityName: string) {
  const m2mRelationsMap: Record<
    string,
    {
      relations: string[];
      idFieldNames: [
        "accompanying" | "self" | "location" | "time",
        string,
        "language" | "activity" | "skill" | "district" | "timeslot",
        string,
      ];
    }
  > = {
    AccompanyingLanguage: {
      idFieldNames: [
        "accompanying",
        "accompanyingId",
        "language",
        "languageId",
      ],
      relations: ["dealLanguage"],
    },
    DealLanguage: {
      idFieldNames: ["self", "dealId", "language", "languageId"],
      relations: ["dealLanguage"],
    },
    DealActivity: {
      idFieldNames: ["self", "dealId", "activity", "activityId"],
      relations: ["dealActivity"],
    },
    DealSkill: {
      idFieldNames: ["self", "dealId", "skill", "skillId"],
      relations: ["dealSkill"],
    },
    LocationDistrict: {
      idFieldNames: ["location", "locationId", "district", "districtId"],
      relations: ["location.locationDistrict"],
    },
    TimeTimeslot: {
      idFieldNames: ["time", "timeId", "timeslot", "timeslotId"],
      relations: ["time.timeTimeslot"],
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
    throw new BadRequestError(errorMsg);
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
    throw new BadRequestError(errorMsg);
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
  rootId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m2mEntity: new (_args?: any) => M,
  list: L[],
  rootEntity: string = "deal",
): Promise<boolean> {
  const {
    relations,
    idFieldNames: [host, hostId, listName, listItemId],
  } = getDealRelationsAndIdFieldName(m2mEntity.name);

  try {
    await dataSource.transaction(async (manager) => {
      const rootRepository = getRepository(
        manager as unknown as DataSource,
        rootEntity,
      );
      const root = await rootRepository.findOne({
        where: { id: rootId },
        relations,
      });

      if (!root) {
        throw new NotFoundError(`Root id:${rootId} not found`);
      }

      const m2mRepository = getRepository(
        manager as unknown as DataSource,
        m2mEntity,
      );

      const rootEntityId = host === "self" ? root.id : (root as Record<string, { id: number }>)[host].id;
      const where = { [hostId]: rootEntityId } as FindOptionsWhere<M>;

      const currentList = await m2mRepository.find({ where });

      if (currentList.length > 0) {
        await m2mRepository.delete(currentList.map(({ id }) => id));
      }

      const newList = list.map((item) => {
        const newItem = new m2mEntity({
          [hostId]: rootEntityId,
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
    logger.warn(
      `Error ${error.message} updating list: ${m2mEntity.name} for volunteer id=${rootId}`,
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
    logger.warn(`Error fetching German language: ${error}`);
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
    limit: parseInt(rawQuery.limit as string, 10) || defaultPageSize,
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

  logger.warn(`Unknown sort order: ${orderDirection}, defaulting to DESC`);
  return "DESC";
}

export function getDocumentUrl(_s3Key: string): string {
  return `${process.env.MOCK_VOLUNTEER_DOC_S3_UPLOAD_URL}/volunteer/1/doc/download?url=${encodeURIComponent("https://d2nwrdddg8skub.cloudfront.net/dev/test_pdf.pdf")}`;
}

export async function getVolunteerDocuments(
  volunteerId: number,
): Promise<ApiDocumentGet[]> {
  const documentRepository = getRepository(dataSource, Document);
  const volunteerDocuments =
    (await documentRepository.find({ where: { volunteerId } })) || [];

  const apiDocuments: ApiDocumentGet[] = volunteerDocuments.map(
    (doc): ApiDocumentGet => ({
      id: doc.id,
      type: doc.type,
      originalName: doc.originalName,
      url: getDocumentUrl(doc.s3Key),
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
    }),
  );

  return apiDocuments;
}

export function normalizeStringArrayInput(input: string | string[]) {
  return Array.isArray(input) ? In(input) : input;
}

export async function updatePerson(
  person: DeepPartial<Person>,
): Promise<Person> {
  const personRepository = getRepository(dataSource, Person);

  if (Object.keys(person.address || {}).length > 1) {
    await updateAddress(person.address);
  }

  await personRepository.save(person);

  return (await personRepository.findOne({
    where: { id: person.id! },
    relations: ["address.postcode"],
  })) as Person;
}

export async function updateAddress(
  address: DeepPartial<Address>,
): Promise<Address> {
  const addressRepository = getRepository(dataSource, Address);

  if (address?.postcode?.value) {
    const postcodeRepository = getRepository(dataSource, Postcode);
    const postcode = await postcodeRepository.findOneBy({
      value: address.postcode.value,
    });
    if (postcode) {
      address.postcodeId = postcode.id;
    }
  }

  await addressRepository.save(address);
  return (await addressRepository.findOne({
    where: { id: address.id! },
    relations: ["postcode"],
  })) as Address;
}

export async function setTranslationType(
  translation: TranslatedIntoType,
): Promise<number> {
  const isoCodeMap = {
    [TranslatedIntoType.DEUTSCHE]: "de",
    [TranslatedIntoType.ENGLISH_OK]: "en",
    [TranslatedIntoType.NO_TRANSLATION]: "zzz",
  };

  if (!isoCodeMap[translation]) {
    throw new Error(
      `Shouldn't happen that languageToTranslate is ${translation}`,
    );
  }

  const languageRepository = getRepository(dataSource, Language);

  const language = await languageRepository.findOne({
    where: { isoCode: isoCodeMap[translation] },
  });

  if (!language) {
    throw new Error(
      `Shouldn't happen that language:${isoCodeMap[translation]} not found.`,
    );
  }

  return language.id;
}

export async function getTranslationType(
  id: number,
): Promise<TranslatedIntoType> {
  const languageRepository = getRepository(dataSource, Language);
  const language = await languageRepository.findOneBy({ id });
  if (!language) {
    throw new NotFoundError("Language for accompanying not fond.");
  }

  switch (language.isoCode) {
    case "de":
      return TranslatedIntoType.DEUTSCHE;
    case "en":
      return TranslatedIntoType.ENGLISH_OK;
    case "zzz":
      return TranslatedIntoType.NO_TRANSLATION;
    default:
      throw new BadRequestError(
        `Cannot interpret ${language.title} as accompanying language.`,
      );
  }
}

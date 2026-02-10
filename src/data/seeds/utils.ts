import {
  DocumentStatusType,
  OccasionalType,
  VolunteerStateAppreciationType,
  VolunteerStateCommunicationType,
  VolunteerStateEngagementType,
  VolunteerStateMatchType,
  VolunteerStateTypeType,
} from "need4deed-sdk";
import { DataSource, IsNull, Repository } from "typeorm";
import Deal from "../entity/deal.entity";
import Address from "../entity/location/address.entity";
import District from "../entity/location/district.entity";
import Location from "../entity/location/location.entity";
import Postcode from "../entity/location/postcode.entity";
import LocationDistrict from "../entity/m2m/location-district";
import ProfileActivity from "../entity/m2m/profile-activity";
import ProfileLanguage from "../entity/m2m/profile-language";
import ProfileSkill from "../entity/m2m/profile-skill";
import TimeTimeslot from "../entity/m2m/time-timeslot";
import Agent from "../entity/opportunity/agent.entity";
import Organization from "../entity/organization.entity";
import Person from "../entity/person.entity";
import Activity from "../entity/profile/activity.entity";
import Category from "../entity/profile/category.entity";
import Language from "../entity/profile/language.entity";
import Profile from "../entity/profile/profile.entity";
import Skill from "../entity/profile/skill.entity";
import Time from "../entity/time/time.entity";
import Timeslot from "../entity/time/timeslot.entity";
import { categorize } from "../lib";
import { AgentOperatorType, AgentType } from "../types";
import { getRepository, getRRULE, getStartEnd } from "../utils";
import {
  AddressJSON,
  AgentJSON,
  DealJSON,
  OrganizationJSON,
  PersonJSON,
  VolunteerJSON,
} from "./types";

const noGenderAvatarUrl = "all_genders_avatar.png";

let postcodeGetter: (value: string) => Promise<Postcode>;
let dummyPerson: Person;
const dummyPersonFilterParams = { email: "anna.doe@need4deed.org" };
let dummyAddress: Address;
const dummyAddressFilterParams = { title: "Dummy" };
let otherLanguage: Language;
const otherLanguageFilterParams = { isoCode: "zzz" };

export async function getLanguage(
  title: string,
  languageRepository: Repository<Language>,
) {
  const mapSpecialTitles = (title: string): string => {
    const map = {
      Bengal: "Bengali",
      Greek: "Modern Greek (1453-)",
      Kurmanji: "Northern Kurdish",
      Kurmanci: "Northern Kurdish",
      Northern: "Northern Kurdish",
      Sorani: "Central Kurdish",
      "Farsi/Dari": "Persian",
      Punjabi: "Panjabi",
      Romanes: "Romany",
      Farsi: "Persian",
      Moldovan: "Romanian",
    };
    return title in map ? map[title] : title;
  };
  const normalizedTitle = mapSpecialTitles(title);
  const language = await languageRepository.findOne({
    where: { title: normalizedTitle },
  });
  if (!language) {
    if (!otherLanguage) {
      otherLanguage = await languageRepository.findOne({
        where: otherLanguageFilterParams,
      });
    }

    return otherLanguage;
  }

  return language;
}

export async function getActivity(
  title,
  activityRepository: Repository<Activity>,
) {
  const activity = await activityRepository.findOne({
    where: { title },
  });
  if (!activity) {
    throw new Error(`Activity with title "${title}" not found.`);
  }
  return activity;
}

export async function getCategory(
  title,
  categoryRepository: Repository<Category>,
) {
  const category = await categoryRepository.findOne({
    where: { title },
  });
  if (!category) {
    throw new Error(`Category with title "${title}" not found.`);
  }
  return category;
}

export function getEnumValue<E>(enumType: object, value: unknown): E {
  if (Object.values(enumType).includes(value)) {
    return value as E;
  }
  return null;
}

export function getDocumentStatus(status: string): DocumentStatusType {
  const statusMap: Record<string, DocumentStatusType> = {
    "": DocumentStatusType.UNDEFINED,
    Applied: DocumentStatusType.APPLIED_SELF,
    Ja: DocumentStatusType.YES,
    Yes: DocumentStatusType.YES,
    "Yes through us": DocumentStatusType.YES,
    "asked to apply": DocumentStatusType.APPLIED_N4D,
    no: DocumentStatusType.NO,
    Nein: DocumentStatusType.NO,
    No: DocumentStatusType.NO,
  };
  return statusMap[status] || DocumentStatusType.UNDEFINED;
}

export function getVolunteerState(volunteer: VolunteerJSON): Partial<{
  statusEngagement: VolunteerStateEngagementType;
  statusCommunication: VolunteerStateCommunicationType;
  statusAppreciation: VolunteerStateAppreciationType;
  statusType: VolunteerStateTypeType;
  statusMatch: VolunteerStateMatchType;
}> {
  return {
    statusEngagement: VolunteerStateEngagementType.NEW,
    statusCommunication: undefined,
    statusAppreciation: undefined,
    statusType: volunteer.accompanying
      ? VolunteerStateTypeType.ACCOMPANYING
      : VolunteerStateTypeType.REGULAR,
    statusMatch: VolunteerStateMatchType.NO_MATCHES,
  };
}

export async function getCount<R>(repository: Repository<R>): Promise<number> {
  const count = await repository
    .createQueryBuilder("r")
    .select("r.id")
    .getCount();

  return count;
}

export async function getPostcodeGetter(dataSource: DataSource) {
  const postcodeRepository = getRepository(dataSource, Postcode);

  let postcode12345 = await postcodeRepository.findOne({
    where: { value: "12345" },
  });
  if (!postcode12345) {
    postcode12345 = new Postcode({ value: "12345" });
    await postcodeRepository.save(postcode12345);
  }

  return async (value: string) => {
    if (!value) {
      return postcode12345;
    }
    const postcode = await postcodeRepository.findOne({
      where: { value },
    });

    if (!postcode) {
      return postcode12345;
    }

    return postcode;
  };
}

async function getOrCreateAddress(
  addressData: AddressJSON,
  dataSource: DataSource,
): Promise<Address> {
  if (!postcodeGetter) {
    postcodeGetter = await getPostcodeGetter(dataSource);
  }
  const postcode = await postcodeGetter(addressData?.postcode?.toString());

  const addressRepository: Repository<Address> = getRepository(
    dataSource,
    Address,
  );

  if (!addressData) {
    if (!dummyAddress) {
      dummyAddress = await addressRepository.findOne({
        where: { ...dummyAddressFilterParams },
      });
    }

    return dummyAddress;
  }

  const existingAddress = await addressRepository.findOne({
    where: { postcodeId: postcode.id, street: "" },
  });
  if (existingAddress) {
    return existingAddress;
  }

  const address = new Address({
    street: "", // Assuming street is not provided in the JSON
    postcode: postcode,
  });

  await addressRepository.save(address);
  return address;
}

export async function getOrCreatePerson(
  personData: PersonJSON,
  dataSource: DataSource,
): Promise<Person> {
  const personRepository: Repository<Person> = getRepository(
    dataSource,
    Person,
  );

  if (!personData) {
    if (!dummyPerson) {
      dummyPerson = await personRepository.findOne({
        where: { ...dummyPersonFilterParams },
      });
    }

    return dummyPerson;
  }

  const existingPerson = await personRepository.findOne({
    where: { email: personData?.email, phone: personData?.phone },
  });

  if (existingPerson) {
    return existingPerson;
  }

  const person = new Person({
    firstName: personData.firstName,
    lastName: personData.lastName,
    email: personData?.email,
    phone: personData?.phone,
    avatarUrl: noGenderAvatarUrl,
  });
  person.address = await getOrCreateAddress(personData?.address, dataSource);

  await personRepository.save(person);
  return person;
}

export async function getOrCreateOrganization(
  organizationData: OrganizationJSON,
  dataSource: DataSource,
): Promise<Organization> {
  const organizationRepository = getRepository(dataSource, Organization);

  const organization = await organizationRepository.findOne({
    where: { title: organizationData.title },
  });

  if (organization) {
    return organization;
  }

  const address = await getOrCreateAddress(
    organizationData.person?.address,
    dataSource,
  );

  const person = await getOrCreatePerson(organizationData.person, dataSource);

  const newOrganization = new Organization({
    title: organizationData.title,
    email: organizationData.person?.email,
    phone: organizationData.person?.phone,
    address,
    person,
  });
  await organizationRepository.save(newOrganization);

  return newOrganization;
}

export async function createDeal(
  dealData: DealJSON,
  dataSource: DataSource,
): Promise<Deal> {
  const activityRepository = getRepository(dataSource, Activity);
  const profileRepository = getRepository(dataSource, Profile);
  const profileActivityRepository = getRepository(dataSource, ProfileActivity);
  const skillRepository = getRepository(dataSource, Skill);
  const profileSkillRepository = getRepository(dataSource, ProfileSkill);
  const languageRepository = getRepository(dataSource, Language);
  const profileLanguageRepository = getRepository(dataSource, ProfileLanguage);
  const timeRepository = getRepository(dataSource, Time);
  const repositoryTimeslot = getRepository(dataSource, Timeslot);
  const timeTimeslotRepository = getRepository(dataSource, TimeTimeslot);
  const locationRepository = getRepository(dataSource, Location);
  const districtRepository = getRepository(dataSource, District);
  const locationDistrictRepository = getRepository(
    dataSource,
    LocationDistrict,
  );
  const dealRepository = getRepository(dataSource, Deal);

  if (!postcodeGetter) {
    postcodeGetter = await getPostcodeGetter(dataSource);
  }
  const postcode = await postcodeGetter(dealData?.postcode);

  const profile = new Profile({
    info: dealData.profile.info,
  });
  await profileRepository.save(profile);

  const categoryIds: number[] = [];
  for (const title of dealData.profile.activities) {
    const activity = await activityRepository.findOne({ where: { title } });
    if (!activity) {
      dataSource.logger.log("warn", `Activity ${title} not found. Skipping.`);
      continue;
    }
    categoryIds.push(activity.categoryId);
    const profileActivity = new ProfileActivity({
      profile: profile,
      activity,
    });
    await profileActivityRepository.save(profileActivity);
  }

  for (const title of dealData.profile.skills) {
    const skill = await skillRepository.findOne({ where: { title } });
    if (!skill) {
      dataSource.logger.log("warn", `Skill ${title} not found. Skipping.`);
      continue;
    }
    const profileSkill = new ProfileSkill({ profile, skill });
    await profileSkillRepository.save(profileSkill);
  }

  for (const [title, level] of dealData.profile.languages) {
    const language = await getLanguage(title, languageRepository);
    if (!language) {
      dataSource.logger.log("warn", `Language ${title} not found. Skipping.`);
      continue;
    }

    const profileLanguage = new ProfileLanguage({
      profile,
      language,
      proficiency: level,
    });
    await profileLanguageRepository.save(profileLanguage);
  }

  profile.categoryId = categorize(categoryIds.filter(Boolean));

  const time = new Time();
  await timeRepository.save(time);

  for (const timeslotData of dealData.time.timeslots) {
    let timeslot: Timeslot;
    const { day, daytime, start, info } = timeslotData;

    if (day && daytime) {
      if (day !== "Occasional") {
        const rrule = getRRULE(day);
        for (const startEnd of daytime) {
          const timeframe = getStartEnd(startEnd);

          if (timeframe) {
            timeslot = await repositoryTimeslot.findOne({
              where: { rrule, ...timeframe, occasional: IsNull() },
            });
            if (!timeslot) {
              timeslot = new Timeslot({
                rrule,
                ...timeframe,
              });
              await repositoryTimeslot.save(timeslot);
              await new Promise((resolve) => setTimeout(resolve, 400)); // To avoid unique constraint violation
            }
          }
        }
      } else {
        for (const dayTimeItem of daytime) {
          const occasional = getEnumValue<OccasionalType>(
            OccasionalType,
            dayTimeItem.toLowerCase() as OccasionalType,
          );
          if (!occasional) {
            dataSource.logger.log(
              "warn",
              `Occasional type ${dayTimeItem} not recognized. Skipping.`,
            );
            continue;
          }
          timeslot = await repositoryTimeslot.findOne({
            where: {
              occasional,
              rrule: IsNull(),
              start: IsNull(),
              end: IsNull(),
            },
          });
          if (!timeslot) {
            timeslot = new Timeslot({ occasional });
            await repositoryTimeslot.save(timeslot);
            await new Promise((resolve) => setTimeout(resolve, 400)); // To avoid unique constraint violation
          }
        }
      }
    } else {
      timeslot = new Timeslot({
        info,
        start: start ? new Date(start) : undefined,
      });
      await repositoryTimeslot.save(timeslot);
    }

    if (timeslot) {
      const timeTimeslot = new TimeTimeslot({
        time,
        timeslot,
      });
      await timeTimeslotRepository.save(timeTimeslot);
    }
  }

  const location = new Location();
  await locationRepository.save(location);

  for (const title of dealData.location.districts) {
    let district = await districtRepository.findOne({ where: { title } });
    if (!district) {
      district = new District({ title });
      await districtRepository.save(district);
    }

    const locationDistrict = new LocationDistrict({ location, district });
    await locationDistrictRepository.save(locationDistrict);
  }

  const deal = new Deal({
    type: dealData.type,
    postcode,
    profile,
    time,
    location,
  });
  await dealRepository.save(deal);
  return deal;
}

export async function getOrCreateAgent(
  agentData: AgentJSON,
  dataSource: DataSource,
): Promise<Agent> {
  const agentRepository = getRepository(dataSource, Agent);

  const agent = await agentRepository.findOne({
    where: { title: agentData.title },
  });

  if (agent) {
    return agent;
  }

  const representative = await getOrCreatePerson(agentData.person, dataSource);

  const organization = await getOrCreateOrganization(
    agentData.organization,
    dataSource,
  );

  if (!postcodeGetter) {
    postcodeGetter = await getPostcodeGetter(dataSource);
  }

  const newAgent = new Agent({
    title: agentData.title,
    type: AgentType.RAC,
    representative,
    operatorType: AgentOperatorType.ORGANIZATION,
    operatorId: organization.id,
    postcode: await postcodeGetter(agentData?.postcode),
  });
  await agentRepository.save(newAgent);
  return newAgent;
}

export function getDistrict(title: string) {
  const mapDistricts = {
    Mitte: ["Mitte", "Wedding", "Tiergarten", "Moabit"],
    "Friedrichshain-Kreuzberg": ["Friedrichshain", "Kreuzberg"],
    Pankow: [
      "Pankow",
      "Buchholz",
      "Französisch Buchholz",
      "Karow",
      "Prenzlauer Berg",
      "Weissensee",
      "Blankenburg",
      "Gesundbrunnen",
    ],
    "Charlottenburg-Wilmersdorf": [
      "Charlottenburg",
      "Westend",
      "Grunewald",
      "Wilmersdorf",
    ],
    Spandau: [
      "Spandau",
      "Gatow",
      "Kladow",
      "Staaken",
      "Wilhelmstadt",
      "Falkenhagener Feld",
      "Hakenfelde",
      "Siemensstadt",
    ],
    "Steglitz-Zehlendorf": [
      "Steglitz",
      "Lichtenfelde",
      "Lankwitz",
      "Lichterfelde",
      "Dahlem",
      "Zehlendorf",
      "Nikolassee",
      "Wannsee",
      "Steinstücken",
      "Schlachtensee",
    ],
    "Tempelhof-Schöneberg": [
      "Tempelhof",
      "Marienfelde",
      "Mariendorf",
      "Schöneberg",
      "Friedenau",
    ],
    Neukölln: ["Neukölln", "Britz", "Buckow", "Gropiusstadt", "Rudow"],
    "Treptow-Köpenick": [
      "Treptow",
      "Baumschulenweg",
      "Johannisthal",
      "Altglienicke",
      "Bohnsdorf",
      "Köpenick",
      "Grünau",
      "Müggelheim",
      "Rahnsdorf",
      "Friedrichshagen",
      "Oberschöneweide",
      "Adlershof",
      "Schmöckwitz",
      "Niederschöneweide",
    ],
    "Marzahn-Hellersdorf": ["Marzahn", "Hellersdorf", "Kaulsdorf", "Mahlsdorf"],
    Lichtenberg: [
      "Lichtenberg",
      "Fennpfuhl",
      "Neu-Hohenschönhausen",
      "Alt-Hohenschönhausen",
      "Karlshorst",
      "Rummelsburg",
    ],
    Reinickendorf: [
      "Waidmannslust",
      "Lübars",
      "Hermsdorf",
      "Tegel",
      "Heiligensee",
      "Frohnau",
      "Konradshöhe",
      "Reinickendorf",
    ],
  };

  const districts = Object.keys(mapDistricts);

  for (const district of districts) {
    if (mapDistricts[district].includes(title)) {
      return district;
    }
  }

  return null;
}

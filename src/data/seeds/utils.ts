import path from "path";
import {
  AgentEngagementStatusType,
  AgentRoleType,
  AgentServiceType,
  AgentTrustType,
  AgentType,
  AgentVolunteerSearchType,
  DocumentStatusType,
  EntityTableName,
  OccasionalType,
  TranslatedIntoType,
  VolunteerStateAppreciationType,
  VolunteerStateCommunicationType,
  VolunteerStateEngagementType,
  VolunteerStateMatchType,
  VolunteerStateTypeType,
} from "need4deed-sdk";
import { DataSource, IsNull, Repository } from "typeorm";
import { check } from "..";
import { titleOrphanageAgent } from "../../config";
import logger from "../../logger";
import { tryCatch } from "../../services/utils";
import Deal from "../entity/deal.entity";
import Address from "../entity/location/address.entity";
import District from "../entity/location/district.entity";
import Location from "../entity/location/location.entity";
import Postcode from "../entity/location/postcode.entity";
import AgentPerson from "../entity/m2m/agent-person";
import LocationDistrict from "../entity/m2m/location-district";
import ProfileActivity from "../entity/m2m/profile-activity";
import ProfileLanguage from "../entity/m2m/profile-language";
import ProfileSkill from "../entity/m2m/profile-skill";
import TimeTimeslot from "../entity/m2m/time-timeslot";
import NotionRelation from "../entity/notion-relation.entity";
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
import { getRepository, getRRULE, getStartEnd } from "../utils";
import {
  _AgentJSON,
  AddressJSON,
  DealJSON,
  OrganizationJSON,
  PersonJSON,
  TimeJSON,
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
    statusEngagement: getEngagementStatus(volunteer.statusEngagement),
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
    email: personData.email,
    phone: personData.phone,
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
  for (const title of dealData.profile.activities ?? []) {
    const activity = await activityRepository.findOne({ where: { title } });
    if (!activity) {
      // logger.warn(`Activity ${title} not found. Skipping.`);
      continue;
    }
    categoryIds.push(activity.categoryId);
    const profileActivity = new ProfileActivity({
      profile: profile,
      activity,
    });
    await profileActivityRepository.save(profileActivity);
  }

  for (const title of dealData.profile.skills ?? []) {
    const skill = await skillRepository.findOne({ where: { title } });
    if (!skill) {
      // logger.warn(`Skill ${title} not found. Skipping.`);
      continue;
    }
    const profileSkill = new ProfileSkill({ profile, skill });
    await profileSkillRepository.save(profileSkill);
  }

  for (const [title, level] of dealData.profile.languages ?? []) {
    const language = await getLanguage(title, languageRepository);
    if (!language) {
      logger.warn(`Language ${title} not found. Skipping.`);
      continue;
    }

    const profileLanguage = new ProfileLanguage({
      profile,
      language,
      proficiency: level,
    });
    await profileLanguageRepository.save(profileLanguage);
  }

  profile.categoryId = categorize(categoryIds.filter(Boolean))!;

  const time = await createTime(dataSource, dealData.time);

  const location = new Location();
  await locationRepository.save(location);

  for (const title of dealData.location.districts ?? []) {
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
  agentData: _AgentJSON,
  dataSource: DataSource,
): Promise<Agent> {
  const agentRepository = getRepository(dataSource, Agent);

  if (!agentData) {
    const orphanage = await agentRepository.findOneBy({
      title: titleOrphanageAgent,
    });
    if (!orphanage) {
      throw new Error("Agent data is empty.");
    }
    return orphanage;
  }

  const agent = await agentRepository.findOne({
    where: { title: agentData.title },
  });

  if (agent) {
    return agent;
  }

  const organization = await getOrCreateOrganization(
    agentData.organization,
    dataSource,
  );

  if (!postcodeGetter) {
    postcodeGetter = await getPostcodeGetter(dataSource);
  }

  const newAgent = new Agent({
    title: agentData.title,
    type: undefined,
    organizationId: organization.id,
  });
  await agentRepository.save(newAgent);

  const person = await getOrCreatePerson(agentData.person, dataSource);

  const agentPersonRepository = getRepository(dataSource, AgentPerson);
  const agentPerson = new AgentPerson({
    agent: newAgent,
    person,
    role: AgentRoleType.MANAGER,
  });
  await agentPersonRepository.save(agentPerson);

  return newAgent;
}

export async function createTime(
  dataSource: DataSource,
  timeData: TimeJSON,
): Promise<Time> {
  const timeRepository = getRepository(dataSource, Time);
  const timeslotRepository = getRepository(dataSource, Timeslot);
  const timeTimeslotRepository = getRepository(dataSource, TimeTimeslot);

  const time = new Time();
  await timeRepository.save(time);

  for (const timeslotData of timeData.timeslots ?? []) {
    let timeslot: Timeslot | null;
    const { day, daytime, start, info } = timeslotData;
    check.log(`createTime:start:${start}`);

    if (day && daytime) {
      if (day !== "Occasional") {
        const rrule = getRRULE(day)!;
        for (const startEnd of daytime) {
          const timeframe = getStartEnd(startEnd);
          if (timeframe) {
            timeslot = await timeslotRepository.findOne({
              where: { rrule, ...timeframe, occasional: IsNull() },
            });
            if (!timeslot) {
              timeslot = new Timeslot({
                rrule,
                ...timeframe,
              });
              await timeslotRepository.save(timeslot);
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
          timeslot = await timeslotRepository.findOne({
            where: {
              occasional,
              rrule: IsNull(),
              start: IsNull(),
              end: IsNull(),
            },
          });

          if (!timeslot) {
            timeslot = new Timeslot({ occasional });
            await timeslotRepository.save(timeslot);
          }
        }
      }
    } else {
      timeslot = start
        ? new Timeslot({
            info: info || "one-timer",
            start: start ? new Date(start) : undefined,
          })
        : undefined;
      await timeslotRepository.save(timeslot);
    }

    if (timeslot && timeslot.id) {
      const timeTimeslot = new TimeTimeslot({
        time,
        timeslot,
      });
      await timeTimeslotRepository.save(timeTimeslot);
      await timeslotRepository.save(timeslot);
    }
  }

  return time;
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

export function isProbablyFileSystemPath(str: string): boolean {
  if (typeof str !== "string") {
    return false;
  }
  if (/^\w+:\/\//.test(str)) {
    return false;
  }
  if (str.trim() === "") {
    return false;
  }

  return (
    path.isAbsolute(str) ||
    str.startsWith(".") ||
    str.includes("/") ||
    str.includes("\\")
  );
}

export async function writeNotionRel(
  dataSource: DataSource,
  notionRel: {
    hostType: EntityTableName;
    hostId: number;
    hostNid: string;
    tenantType: EntityTableName;
    tenantId: number;
    tenantNid: string;
  },
) {
  const notionRelationRepository = getRepository(dataSource, NotionRelation);

  const notionRelation = new NotionRelation(notionRel);
  const [, error] = await tryCatch(
    notionRelationRepository.save(notionRelation),
  );
  if (error) {
    dataSource.logger.log(
      "warn",
      `During storing NotionRelation occurred: ${error}`,
    );
  }
}

export function getAgentTrustLevel(level: string): AgentTrustType {
  if (getEnumValue(AgentTrustType, level)) {
    return level as AgentTrustType;
  }

  switch (level) {
    case "Low":
      return AgentTrustType.LOW;
    case "High":
      return AgentTrustType.HIGH;
  }
  return AgentTrustType.UNKNOWN;
}

export function getAgentType(type: string): AgentType {
  if (getEnumValue(AgentType, type)) {
    return type as AgentType;
  }

  switch (type) {
    case "Multiple social support":
      return AgentType.MULTIPLE_SOCIAL_SUPPORT;
  }

  return null;
}

export function getAgentSearchStatus(status: string): AgentVolunteerSearchType {
  if (getEnumValue(AgentVolunteerSearchType, status)) {
    return status as AgentVolunteerSearchType;
  }

  switch (status) {
    case "Searching":
      return AgentVolunteerSearchType.SEARCHING;
    case "Filled":
      return AgentVolunteerSearchType.VOLUNTEERS_FOUND;
  }
}

export function getAgentEngagement(status: string): AgentEngagementStatusType {
  if (getEnumValue(AgentEngagementStatusType, status)) {
    return status as AgentEngagementStatusType;
  }

  switch (status) {
    case "Unresponsive":
      return AgentEngagementStatusType.UNRESPONSIVE;
    case "Active":
      return AgentEngagementStatusType.ACTIVE;
  }
}

export function getAgentService(service: string): AgentServiceType {
  if (getEnumValue(AgentServiceType, service)) {
    return service as AgentServiceType;
  }

  const map = {
    Accompanying: AgentServiceType.TANDEM,
    "addiction help": AgentServiceType.CONSULTATION,
    Adults: AgentServiceType.CONSULTATION,
    "anti-racism": AgentServiceType.CONSULTATION,
    Arts: AgentServiceType.TUTORING,
    Ausbildung: AgentServiceType.TUTORING,
    care: AgentServiceType.WELFARE,
    Community: AgentServiceType.WELFARE,
    Cooking: AgentServiceType.REFUGEE_ACCOMMODATION,
    Counselling: AgentServiceType.CONSULTATION,
    Culture: AgentServiceType.WELFARE,
    Education: AgentServiceType.TUTORING,
    "Elderly Care": AgentServiceType.WELFARE,
    Environment: AgentServiceType.TANDEM,
    Family: AgentServiceType.TUTORING,
    Film: AgentServiceType.WELFARE,
    Funding: AgentServiceType.WELFARE,
    Gardening: AgentServiceType.TANDEM,
    Health: AgentServiceType.WELFARE,
    "help with private housing": AgentServiceType.TUTORING,
    homeless: AgentServiceType.WELFARE,
    housing: AgentServiceType.WELFARE,
    "Humanitarian aid": AgentServiceType.VOLUNTARY_SUPPORT,
    "Job Coaching": AgentServiceType.JOB_COACHING,
    Kids: AgentServiceType.CHILDCARE,
    Kitas: AgentServiceType.CHILDCARE,
    "Language help": AgentServiceType.TANDEM,
    Law: AgentServiceType.TANDEM,
    "LGBTQ+": AgentServiceType.CONSULTATION,
    Library: AgentServiceType.TUTORING,
    Men: AgentServiceType.SPORT,
    Migrants: AgentServiceType.VOLUNTARY_SUPPORT,
    music: AgentServiceType.TANDEM,
    Neighbourhood: AgentServiceType.WELFARE,
    Parents: AgentServiceType.CHILDCARE,
    "Political work": AgentServiceType.TANDEM,
    "Psychological help": AgentServiceType.TUTORING,
    Refugees: AgentServiceType.VOLUNTARY_SUPPORT,
    "social and youth service": AgentServiceType.YOUTH,
    "Social work": AgentServiceType.TANDEM,
    Sports: AgentServiceType.SPORT,
    Theatre: AgentServiceType.TANDEM,
    Tutoring: AgentServiceType.TUTORING,
    Volunteering: AgentServiceType.VOLUNTARY_SUPPORT,
    Women: AgentServiceType.WELFARE,
    "workers rights": AgentServiceType.CONSULTATION,
    workshops: AgentServiceType.REFUGEE_ACCOMMODATION,
    Youth: AgentServiceType.YOUTH,
  };

  const res = map[service];
  return res ? res : AgentServiceType.REFUGEE_ACCOMMODATION;
}

export function getAgentPersonRole(role: string): AgentRoleType {
  if (getEnumValue(AgentRoleType, role)) {
    return role as AgentRoleType;
  }

  const map = {
    Management: AgentRoleType.MANAGER,
    "Social Work": AgentRoleType.SOCIAL_WORKER,
    "Volunteer coordinator": AgentRoleType.VOLUNTEER_COORDINATOR,
    "Volunteer Coordinator": AgentRoleType.VOLUNTEER_COORDINATOR,
  };

  const res = map[role];
  return res ? res : AgentRoleType.OTHER;
}

export function getToTranslate(translate: string): TranslatedIntoType {
  if (getEnumValue(TranslatedIntoType, translate)) {
    return translate as TranslatedIntoType;
  }

  const map = {
    English: TranslatedIntoType.ENGLISH_OK,
    "English, German": TranslatedIntoType.ENGLISH_OK,
    "English, German, No specific language needed":
      TranslatedIntoType.ENGLISH_OK,
    German: TranslatedIntoType.DEUTSCHE,
    "German, No specific language needed": TranslatedIntoType.DEUTSCHE,
    "No specific language needed": TranslatedIntoType.NO_TRANSLATION,
  };

  const res = map[translate];
  return res ? res : TranslatedIntoType.DEUTSCHE;
}

function getEngagementStatus(status: string): VolunteerStateEngagementType {
  if (getEnumValue(VolunteerStateEngagementType, status)) {
    return status as VolunteerStateEngagementType;
  }

  const map = {
    Active: VolunteerStateEngagementType.ACTIVE,
    Available: VolunteerStateEngagementType.AVAILABLE,
    Inactive: VolunteerStateEngagementType.INACTIVE,
    New: VolunteerStateEngagementType.NEW,
    "Temp Unavailable": VolunteerStateEngagementType.TEMP_UNAVAILABLE,
    Unresponsive: VolunteerStateEngagementType.UNRESPONSIVE,
  };

  const res = map[status];
  return res ? res : VolunteerStateEngagementType.NEW;
}

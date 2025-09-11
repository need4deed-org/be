import {
  DocumentStatusType,
  LangProficiency,
  OccasionalType,
} from "need4deed-sdk";
import { DataSource, EntityManager, IsNull, Repository } from "typeorm";

import { seedVolunteersFile } from "../../config/constants";
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
import Person from "../entity/person.entity";
import Activity from "../entity/profile/activity.entity";
import Language from "../entity/profile/language.entity";
import Profile from "../entity/profile/profile.entity";
import Skill from "../entity/profile/skill.entity";
import Time from "../entity/time/time.entity";
import Timeslot from "../entity/time/timeslot.entity";
import Volunteer from "../entity/volunteer/volunteer.entity";
import { DealType } from "../types";
import { categorize, getStartEnd, readJsonAsync } from "../utils";
import { getDocumentStatus, getEnumValue, getLanguage } from "./utils";

interface ProfileJSON {
  info: string;
  activities: string[];
  skills: string[];
  languages: [string, LangProficiency][];
}
interface TimeJSON {
  timeslots: {
    day: string;
    daytime: string[];
  }[];
}
interface LocationJSON {
  districts: string[];
}
interface DealJSON {
  type: string;
  postcode: string;
  profile: ProfileJSON;
  time: TimeJSON;
  location: LocationJSON;
}
interface AddressJSON {
  postcode: number;
}
interface PersonJSON {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: AddressJSON;
}
interface VolunteerJSON {
  statusCGC: DocumentStatusType;
  statusVaccination: DocumentStatusType;
  info: string;
  person: PersonJSON;
  deal: DealJSON;
}

let postcodeGetter: (value: string) => Promise<Postcode>;

function getRepository<T>(
  entityManager: EntityManager,
  entity: new () => T,
): Repository<T> {
  const repository = entityManager.getRepository(entity);
  if (!repository) {
    throw new Error(`${entity.name} entity is not initialized.`);
  }
  return repository;
}

async function getPostcodeGetter(dataSource: DataSource) {
  const postcodeRepository = dataSource.getRepository(Postcode);
  if (!postcodeRepository) {
    throw new Error("Postcode entity is not initialized.");
  }
  let postcode12345 = await postcodeRepository.findOne({
    where: { value: "12345" },
  });
  if (!postcode12345) {
    postcode12345 = new Postcode({ value: "12345" });
    await postcodeRepository.save(postcode12345);
  }

  return async (value: string) => {
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
  entityManager: EntityManager,
): Promise<Address> {
  const postcode = postcodeGetter
    ? await postcodeGetter(addressData.postcode?.toString())
    : null;

  const addressRepository: Repository<Address> = getRepository(
    entityManager,
    Address,
  );
  const existingAddress = await addressRepository.findOne({
    where: { postcodeId: postcode.id },
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

async function getOrCreatePerson(
  personData: PersonJSON,
  entityManager: EntityManager,
): Promise<Person> {
  const personRepository: Repository<Person> = getRepository(
    entityManager,
    Person,
  );
  const existingPerson = await personRepository.findOne({
    where: { email: personData.email, phone: personData.phone },
  });

  if (existingPerson) {
    return existingPerson;
  }

  const person = new Person({
    firstName: personData.firstName,
    lastName: personData.lastName,
    email: personData.email,
    phone: personData.phone,
  });

  if (personData.address) {
    const address = await getOrCreateAddress(personData.address, entityManager);
    person.address = address;
  }

  await personRepository.save(person);
  return person;
}

async function createDeal(
  dealData: DealJSON,
  entityManager: EntityManager,
): Promise<Deal> {
  const activityRepository = getRepository(entityManager, Activity);
  const profileRepository = getRepository(entityManager, Profile);
  const profileActivityRepository = getRepository(
    entityManager,
    ProfileActivity,
  );
  const skillRepository = getRepository(entityManager, Skill);
  const profileSkillRepository = getRepository(entityManager, ProfileSkill);
  const languageRepository = getRepository(entityManager, Language);
  const profileLanguageRepository = getRepository(
    entityManager,
    ProfileLanguage,
  );
  const timeRepository = getRepository(entityManager, Time);
  const repositoryTimeslot = getRepository(entityManager, Timeslot);
  const timeTimeslotRepository = getRepository(entityManager, TimeTimeslot);
  const locationRepository = getRepository(entityManager, Location);
  const districtRepository = getRepository(entityManager, District);
  const locationDistrictRepository = getRepository(
    entityManager,
    LocationDistrict,
  );
  const dealRepository = getRepository(entityManager, Deal);

  const postcode = await postcodeGetter(dealData.postcode);

  const profile = new Profile({
    info: dealData.profile.info,
  });
  await profileRepository.save(profile);

  const categoryIds: number[] = [];
  for (const title of dealData.profile.activities) {
    const activity = await activityRepository.findOne({ where: { title } });
    if (!activity) {
      console.log(`Activity ${title} not found. Skipping.`);
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
      console.log(`Skill ${title} not found. Skipping.`);
      continue;
    }
    const profileSkill = new ProfileSkill({ profile, skill });
    await profileSkillRepository.save(profileSkill);
  }

  for (const [title, level] of dealData.profile.languages) {
    const language = await getLanguage(title, languageRepository);
    const proficiency = getEnumValue(LangProficiency, level);
    if (!language) {
      console.log(`Language ${title} not found. Skipping.`);
      continue;
    }

    const profileLanguage = new ProfileLanguage({
      profile,
      language,
      proficiency,
    });
    await profileLanguageRepository.save(profileLanguage);
  }

  profile.categoryId = categorize(categoryIds.filter(Boolean));

  const time = new Time();
  await timeRepository.save(time);

  for (const { day, daytime } of dealData.time.timeslots) {
    const rrule = `FREQ=WEEKLY;BYDAY=${day.slice(0, 2).toUpperCase()};`;
    let occasional: OccasionalType | null = null;
    let timeslot: Timeslot;
    if (day !== "Occasional") {
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
          }
        }
      }
    } else {
      for (const dayTimeItem of daytime) {
        const occasional = getEnumValue<OccasionalType>(
          OccasionalType,
          dayTimeItem as OccasionalType,
        );
        if (!occasional) {
          console.warn(
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
        }
        await repositoryTimeslot.save(timeslot);
      }
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

  for (let title of dealData.location.districts) {
    let district = await districtRepository.findOne({ where: { title } });
    if (!district) {
      district = new District({ title });
      await districtRepository.save(district);
    }

    const locationDistrict = new LocationDistrict({ location, district });
    await locationDistrictRepository.save(locationDistrict);
  }

  const deal = new Deal({
    type: DealType.VOLUNTEER,
    postcode,
    profile,
    time,
    location,
  });
  await dealRepository.save(deal);
  return deal;
}

export async function seedVolunteers(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const volunteerRepository = getRepository(
    dataSource as unknown as EntityManager,
    Volunteer,
  );

  const count = await volunteerRepository
    .createQueryBuilder("v")
    .select("v.id")
    .getCount();
  if (count !== 0) {
    dataSource.logger.log("info", "Skipping seeding volunteers.");
    return;
  }

  const volunteers = (await readJsonAsync(
    seedVolunteersFile,
  )) as VolunteerJSON[];

  postcodeGetter = await getPostcodeGetter(dataSource);

  volunteers.forEach(async (volunteer) => {
    try {
      const person = await getOrCreatePerson(
        volunteer.person,
        dataSource as unknown as EntityManager,
      );

      const deal = await createDeal(
        volunteer.deal,
        dataSource as unknown as EntityManager,
      );

      const newVolunteer = new Volunteer({
        statusCGC: getDocumentStatus(volunteer.statusCGC),
        statusVaccination: getDocumentStatus(volunteer.statusVaccination),
        info: volunteer.info || "",
        person,
        deal,
      });
      await volunteerRepository.save(newVolunteer);
    } catch (error) {
      console.error(
        `Creation of volunteer ${volunteer?.person?.email} rolled back due to error: ${error.message}`,
      );
    }
  });
}

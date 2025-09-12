import {
  DocumentStatusType,
  LangProficiency,
  OccasionalType,
} from "need4deed-sdk";
import { DataSource, IsNull, Repository } from "typeorm";

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

const noGenderAvatarUrl = "all_genders_avatar.png";

let postcodeGetter: (value: string) => Promise<Postcode>;

function getRepository<T>(
  dataSource: DataSource,
  entity: new () => T,
): Repository<T> {
  const repository = dataSource.getRepository(entity);
  if (!repository) {
    throw new Error(`${entity.name} entity is not initialized.`);
  }
  return repository;
}

async function getPostcodeGetter(dataSource: DataSource) {
  const postcodeRepository = dataSource.getRepository(Postcode);

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
  dataSource: DataSource,
): Promise<Address> {
  const postcode = postcodeGetter
    ? await postcodeGetter(addressData.postcode?.toString())
    : null;

  const addressRepository: Repository<Address> = getRepository(
    dataSource,
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
  dataSource: DataSource,
): Promise<Person> {
  const personRepository: Repository<Person> = getRepository(
    dataSource,
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
    avatarUrl: noGenderAvatarUrl,
  });
  if (personData.address) {
    const address = await getOrCreateAddress(personData.address, dataSource);
    person.address = address;
  }

  await personRepository.save(person);
  return person;
}

async function createDeal(
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

  const postcode = await postcodeGetter(dealData.postcode);

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
    const proficiency = getEnumValue(LangProficiency, level);
    if (!language) {
      dataSource.logger.log("warn", `Language ${title} not found. Skipping.`);
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
    let timeslot: Timeslot;
    if (day !== "Occasional") {
      const rrule = `FREQ=WEEKLY;BYDAY=${day.slice(0, 2).toUpperCase()};`;
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
    dataSource as unknown as DataSource,
    Volunteer,
  );

  const count = await volunteerRepository
    .createQueryBuilder("v")
    .select("v.id")
    .getCount();
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding volunteers.");
    return;
  }

  const volunteers = (await readJsonAsync(
    seedVolunteersFile,
  )) as VolunteerJSON[];

  postcodeGetter = await getPostcodeGetter(dataSource);

  volunteers.forEach(async (volunteer) => {
    try {
      const person = await getOrCreatePerson(volunteer.person, dataSource);

      const deal = await createDeal(volunteer.deal, dataSource);

      const newVolunteer = new Volunteer({
        statusCGC: getDocumentStatus(volunteer.statusCGC),
        statusVaccination: getDocumentStatus(volunteer.statusVaccination),
        info: volunteer.info || "",
        person,
        deal,
      });
      await volunteerRepository.save(newVolunteer);
    } catch (error) {
      dataSource.logger.log(
        "log",
        `Creation of volunteer ${volunteer?.person?.email} rolled back due to error: ${error.message}`,
      );
    }
  });
}

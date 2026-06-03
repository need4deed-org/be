import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Location from "../../../data/entity/location/location.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import LocationDistrict from "../../../data/entity/m2m/location-district";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";

export async function writeVolunteerLegacy(
  volunteer: Volunteer,
): Promise<number> {
  // Use a transaction to ensure atomicity
  await dataSource.manager.transaction(async (transactionalEntityManager) => {
    // 1. Get all necessary repositories using the transactional entity manager
    const addressRepository = transactionalEntityManager.getRepository(Address);
    const personRepository = transactionalEntityManager.getRepository(Person);
    const dealActivityRepository =
      transactionalEntityManager.getRepository(DealActivity);
    const dealSkillRepository =
      transactionalEntityManager.getRepository(DealSkill);
    const dealLanguageRepository =
      transactionalEntityManager.getRepository(DealLanguage);
    const dealTimeslotRepository =
      transactionalEntityManager.getRepository(DealTimeslot);
    const locationRepository =
      transactionalEntityManager.getRepository(Location);
    const locationDistrictRepository =
      transactionalEntityManager.getRepository(LocationDistrict);
    const dealRepository = transactionalEntityManager.getRepository(Deal);
    const volunteerRepository =
      transactionalEntityManager.getRepository(Volunteer);

    // 2. Perform all save operations using the transactional repositories
    // Address
    await addressRepository.save(volunteer.person.address);

    // Person
    await personRepository.save(volunteer.person);

    // Location
    await locationRepository.save(volunteer.deal.location);
    const locationId = volunteer.deal.location.id;

    // Location m2m relations (districts)
    for (const locationDistrict of volunteer.deal.location.locationDistrict) {
      locationDistrict.locationId = locationId;
    }
    await locationDistrictRepository.save(
      volunteer.deal.location.locationDistrict,
    );

    // Deal
    await dealRepository.save(volunteer.deal);
    const dealId = volunteer.deal.id;

    // Deal m2m relations (activities, skills, languages, timeslots) — saved
    // after the deal so dealId exists
    for (const dealActivity of volunteer.deal.dealActivity) {
      dealActivity.dealId = dealId;
    }
    await dealActivityRepository.save(volunteer.deal.dealActivity);

    for (const dealSkill of volunteer.deal.dealSkill) {
      dealSkill.dealId = dealId;
    }
    await dealSkillRepository.save(volunteer.deal.dealSkill);

    for (const dealLanguage of volunteer.deal.dealLanguage) {
      dealLanguage.dealId = dealId;
    }
    await dealLanguageRepository.save(volunteer.deal.dealLanguage);

    for (const dealTimeslot of volunteer.deal.dealTimeslot) {
      dealTimeslot.dealId = dealId;
    }
    await dealTimeslotRepository.save(volunteer.deal.dealTimeslot);

    // Volunteer
    await volunteerRepository.save(volunteer);
  });

  // The id will be populated on the original object after the transaction completes
  return volunteer.id;
}

import { AppDataSource } from "../../data/data-source";
import Deal from "../../data/entity/deal.entity";
import Address from "../../data/entity/location/address.entity";
import Location from "../../data/entity/location/location.entity";
import LocationDistrict from "../../data/entity/m2m/location-district";
import ProfileActivity from "../../data/entity/m2m/profile-activity";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import ProfileSkill from "../../data/entity/m2m/profile-skill";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Person from "../../data/entity/person.entity";
import Profile from "../../data/entity/profile/profile.entity";
import Time from "../../data/entity/time/time.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { Id } from "../../data/types";

export async function writeVolunteer(volunteer: Volunteer): Promise<Id> {
  // Use a transaction to ensure atomicity
  await AppDataSource.manager.transaction(
    async (transactionalEntityManager) => {
      // 1. Get all necessary repositories using the transactional entity manager
      const addressRepository =
        transactionalEntityManager.getRepository(Address);
      const personRepository = transactionalEntityManager.getRepository(Person);
      const profileRepository =
        transactionalEntityManager.getRepository(Profile);
      const profileActivityRepository =
        transactionalEntityManager.getRepository(ProfileActivity);
      const profileSkillRepository =
        transactionalEntityManager.getRepository(ProfileSkill);
      const profileLanguageRepository =
        transactionalEntityManager.getRepository(ProfileLanguage);
      const timeRepository = transactionalEntityManager.getRepository(Time);
      const timeTimeslotRepository =
        transactionalEntityManager.getRepository(TimeTimeslot);
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

      // Profile
      await profileRepository.save(volunteer.deal.profile);
      const profileId = volunteer.deal.profile.id;

      // Profile m2m relations (activities, skills, languages)
      for (const profileActivity of volunteer.deal.profile.profileActivity) {
        profileActivity.profileId = profileId;
      }
      await profileActivityRepository.save(
        volunteer.deal.profile.profileActivity,
      );

      for (const profileSkill of volunteer.deal.profile.profileSkill) {
        profileSkill.profileId = profileId;
      }
      await profileSkillRepository.save(volunteer.deal.profile.profileSkill);

      for (const profileLanguage of volunteer.deal.profile.profileLanguage) {
        profileLanguage.profileId = profileId;
      }
      await profileLanguageRepository.save(
        volunteer.deal.profile.profileLanguage,
      );

      // Time
      await timeRepository.save(volunteer.deal.time);
      const timeId = volunteer.deal.time.id;

      // Time m2m relations (timeslots)
      for (const timeTimeslot of volunteer.deal.time.timeTimeslot) {
        timeTimeslot.timeId = timeId;
      }
      await timeTimeslotRepository.save(volunteer.deal.time.timeTimeslot);

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

      // Volunteer
      await volunteerRepository.save(volunteer);
    },
  );

  // The id will be populated on the original object after the transaction completes
  return volunteer.id;
}

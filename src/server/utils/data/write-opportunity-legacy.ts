import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Location from "../../../data/entity/location/location.entity";
import LocationDistrict from "../../../data/entity/m2m/location-district";
import ProfileActivity from "../../../data/entity/m2m/profile-activity";
import ProfileLanguage from "../../../data/entity/m2m/profile-language";
import ProfileSkill from "../../../data/entity/m2m/profile-skill";
import TimeTimeslot from "../../../data/entity/m2m/time-timeslot";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Profile from "../../../data/entity/profile/profile.entity";
import Time from "../../../data/entity/time/time.entity";

export async function writeOpportunityLegacy(
  opportunity: Opportunity,
): Promise<number> {
  await dataSource.manager.transaction(async (transactionalEntityManager) => {
    const opportunityRepository =
      transactionalEntityManager.getRepository(Opportunity);
    const dealRepository = transactionalEntityManager.getRepository(Deal);
    const profileRepository = transactionalEntityManager.getRepository(Profile);
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
    const accompanyingRepository =
      transactionalEntityManager.getRepository(Accompanying);

    await profileRepository.save(opportunity.deal.profile);

    for (const profileActivity of opportunity.deal.profile.profileActivity) {
      profileActivity.profileId = opportunity.deal.profile.id;
      await profileActivityRepository.save(profileActivity);
    }

    for (const profileSkill of opportunity.deal.profile.profileSkill) {
      profileSkill.profileId = opportunity.deal.profile.id;
      await profileSkillRepository.save(profileSkill);
    }

    for (const profileLanguage of opportunity.deal.profile.profileLanguage) {
      profileLanguage.profileId = opportunity.deal.profile.id;
      await profileLanguageRepository.save(profileLanguage);
    }

    await timeRepository.save(opportunity.deal.time);
    for (const timeTimeslot of opportunity.deal.time.timeTimeslot) {
      timeTimeslot.timeId = opportunity.deal.time.id;
      await timeTimeslotRepository.save(timeTimeslot);
    }

    await locationRepository.save(opportunity.deal.location);
    for (const locationDistrict of opportunity.deal.location.locationDistrict) {
      locationDistrict.locationId = opportunity.deal.location.id;
      await locationDistrictRepository.save(locationDistrict);
    }

    await dealRepository.save(opportunity.deal);

    if (opportunity.accompanying) {
      await accompanyingRepository.save(opportunity.accompanying);
    }

    await opportunityRepository.save(opportunity);
  });

  return opportunity.id;
}

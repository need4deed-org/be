import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Location from "../../../data/entity/location/location.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import LocationDistrict from "../../../data/entity/m2m/location-district";
import ProfileLanguage from "../../../data/entity/m2m/profile-language";
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
    const dealActivityRepository =
      transactionalEntityManager.getRepository(DealActivity);
    const dealSkillRepository =
      transactionalEntityManager.getRepository(DealSkill);
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

    // Deal m2m relations (activities, skills) — saved after the deal so
    // dealId exists
    for (const dealActivity of opportunity.deal.dealActivity) {
      dealActivity.dealId = opportunity.deal.id;
    }
    await dealActivityRepository.save(opportunity.deal.dealActivity);

    for (const dealSkill of opportunity.deal.dealSkill) {
      dealSkill.dealId = opportunity.deal.id;
    }
    await dealSkillRepository.save(opportunity.deal.dealSkill);

    if (opportunity.accompanying) {
      await accompanyingRepository.save(opportunity.accompanying);
    }

    await opportunityRepository.save(opportunity);
  });

  return opportunity.id;
}

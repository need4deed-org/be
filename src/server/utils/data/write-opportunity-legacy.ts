import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Location from "../../../data/entity/location/location.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import LocationDistrict from "../../../data/entity/m2m/location-district";
import TimeTimeslot from "../../../data/entity/m2m/time-timeslot";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Time from "../../../data/entity/time/time.entity";

export async function writeOpportunityLegacy(
  opportunity: Opportunity,
): Promise<number> {
  await dataSource.manager.transaction(async (transactionalEntityManager) => {
    const opportunityRepository =
      transactionalEntityManager.getRepository(Opportunity);
    const dealRepository = transactionalEntityManager.getRepository(Deal);
    const dealActivityRepository =
      transactionalEntityManager.getRepository(DealActivity);
    const dealSkillRepository =
      transactionalEntityManager.getRepository(DealSkill);
    const dealLanguageRepository =
      transactionalEntityManager.getRepository(DealLanguage);
    const timeRepository = transactionalEntityManager.getRepository(Time);
    const timeTimeslotRepository =
      transactionalEntityManager.getRepository(TimeTimeslot);
    const locationRepository =
      transactionalEntityManager.getRepository(Location);
    const locationDistrictRepository =
      transactionalEntityManager.getRepository(LocationDistrict);
    const accompanyingRepository =
      transactionalEntityManager.getRepository(Accompanying);

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
    const dealId = opportunity.deal.id;

    for (const dealActivity of opportunity.deal.dealActivity) {
      dealActivity.dealId = dealId;
      await dealActivityRepository.save(dealActivity);
    }

    for (const dealSkill of opportunity.deal.dealSkill) {
      dealSkill.dealId = dealId;
      await dealSkillRepository.save(dealSkill);
    }

    for (const dealLanguage of opportunity.deal.dealLanguage) {
      dealLanguage.dealId = dealId;
      await dealLanguageRepository.save(dealLanguage);
    }

    if (opportunity.accompanying) {
      await accompanyingRepository.save(opportunity.accompanying);
    }

    await opportunityRepository.save(opportunity);
  });

  return opportunity.id;
}

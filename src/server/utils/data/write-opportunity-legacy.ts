import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Location from "../../../data/entity/location/location.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import LocationDistrict from "../../../data/entity/m2m/location-district";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";

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
    const dealTimeslotRepository =
      transactionalEntityManager.getRepository(DealTimeslot);
    const locationRepository =
      transactionalEntityManager.getRepository(Location);
    const locationDistrictRepository =
      transactionalEntityManager.getRepository(LocationDistrict);
    const accompanyingRepository =
      transactionalEntityManager.getRepository(Accompanying);

    await locationRepository.save(opportunity.deal.location);
    for (const locationDistrict of opportunity.deal.location.locationDistrict) {
      locationDistrict.locationId = opportunity.deal.location.id;
      await locationDistrictRepository.save(locationDistrict);
    }

    await dealRepository.save(opportunity.deal);

    // Deal m2m relations (activities, skills, languages, timeslots) — saved
    // after the deal so dealId exists
    for (const dealActivity of opportunity.deal.dealActivity) {
      dealActivity.dealId = opportunity.deal.id;
    }
    await dealActivityRepository.save(opportunity.deal.dealActivity);

    for (const dealSkill of opportunity.deal.dealSkill) {
      dealSkill.dealId = opportunity.deal.id;
    }
    await dealSkillRepository.save(opportunity.deal.dealSkill);

    for (const dealLanguage of opportunity.deal.dealLanguage) {
      dealLanguage.dealId = opportunity.deal.id;
    }
    await dealLanguageRepository.save(opportunity.deal.dealLanguage);

    for (const dealTimeslot of opportunity.deal.dealTimeslot) {
      dealTimeslot.dealId = opportunity.deal.id;
    }
    await dealTimeslotRepository.save(opportunity.deal.dealTimeslot);

    if (opportunity.accompanying) {
      await accompanyingRepository.save(opportunity.accompanying);
    }

    await opportunityRepository.save(opportunity);
  });

  return opportunity.id;
}

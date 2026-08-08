import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { setAgentSearching } from "./for-routes";

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
    const dealDistrictRepository =
      transactionalEntityManager.getRepository(DealDistrict);
    const accompanyingRepository =
      transactionalEntityManager.getRepository(Accompanying);
    const onetimerRepository =
      transactionalEntityManager.getRepository(Onetimer);

    await dealRepository.save(opportunity.deal);

    // Deal m2m relations (activities, skills, languages, timeslots, districts)
    // — saved after the deal so dealId exists
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

    for (const dealDistrict of opportunity.deal.dealDistrict) {
      dealDistrict.dealId = opportunity.deal.id;
    }
    await dealDistrictRepository.save(opportunity.deal.dealDistrict);

    if (opportunity.accompanying) {
      await accompanyingRepository.save(opportunity.accompanying);
    }

    if (opportunity.onetimer) {
      await onetimerRepository.save(opportunity.onetimer);
    }

    await opportunityRepository.save(opportunity);

    // A newly-created opportunity always starts in a status that implies
    // searching (be#862) — the create form has no field to set it otherwise,
    // so the owning agent's volunteerSearch flips to SEARCHING unconditionally.
    await setAgentSearching(opportunity.agentId, transactionalEntityManager);
  });

  return opportunity.id;
}

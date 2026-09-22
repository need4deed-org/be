import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { patchOrReplaceAddress } from "./for-routes";

// An existing Address the caller wants volunteer.person repointed/patched to
// (e.g. resolveAddress in parser-volunteer-self-register.ts, when the Person
// already owns an Address from an earlier flow), applied here via
// patchOrReplaceAddress rather than a blind `addressRepository.save(...)` of
// an entity read much earlier — that earlier read (and any ownership check
// done at that point) could go stale in the gap before this transaction runs
// (be#1031/#1033 review). patchOrReplaceAddress re-checks exclusive
// ownership fresh, right here, and clones into a new Address instead of
// patching in place if the row became shared with another Person since.
// Omitted entirely means a brand-new Address (volunteer.person.address holds
// the unsaved entity) — nothing could have raced it, so it's just inserted.
export interface AddressReusePlan {
  addressId: number;
  postcodeId: number;
}

export async function writeVolunteerLegacy(
  volunteer: Volunteer,
  addressReuse?: AddressReusePlan,
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
    const dealDistrictRepository =
      transactionalEntityManager.getRepository(DealDistrict);
    const dealRepository = transactionalEntityManager.getRepository(Deal);
    const volunteerRepository =
      transactionalEntityManager.getRepository(Volunteer);

    // 2. Perform all save operations using the transactional repositories
    // Address — see AddressReusePlan above for why the reuse case goes
    // through patchOrReplaceAddress instead of a blind full-entity save.
    if (addressReuse) {
      const patched = await patchOrReplaceAddress(
        volunteer.person.id,
        { id: addressReuse.addressId },
        { id: addressReuse.postcodeId },
        transactionalEntityManager,
      );
      if (!patched) {
        throw new Error(
          `Failed to reuse Address ${addressReuse.addressId} for Person ${volunteer.person.id}.`,
        );
      }
      // patchOrReplaceAddress may have repointed the Person to a brand-new
      // Address (the clone-instead-of-patch branch, if it turned out to be
      // shared) — refresh so the save below persists the right addressId.
      const refreshedPerson = await personRepository.findOneByOrFail({
        id: volunteer.person.id,
      });
      volunteer.person.addressId = refreshedPerson.addressId;
    } else {
      await addressRepository.save(volunteer.person.address);
    }

    // Person
    await personRepository.save(volunteer.person);

    // Deal
    await dealRepository.save(volunteer.deal);
    const dealId = volunteer.deal.id;

    // Deal m2m relations (activities, skills, languages, timeslots, districts)
    // — saved after the deal so dealId exists
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

    for (const dealDistrict of volunteer.deal.dealDistrict) {
      dealDistrict.dealId = dealId;
    }
    await dealDistrictRepository.save(volunteer.deal.dealDistrict);

    // Volunteer
    await volunteerRepository.save(volunteer);
  });

  // The id will be populated on the original object after the transaction completes
  return volunteer.id;
}

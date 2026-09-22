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

// What to do with volunteer.person.address at write time, decided by the
// caller much earlier (e.g. resolveAddress in parser-volunteer-self-register.ts)
// based on a read that may now be stale:
//   - omitted:      brand-new Address, nothing else could have raced it — save
//                    the whole entity (insert) as before.
//   - "skip":       reusing the Person's existing Address unchanged — do not
//                    write it at all.
//   - "patch":      reusing the Person's existing Address, only its postcode
//                    needs to change — a targeted update touching just that
//                    column.
// A blind `addressRepository.save(volunteer.person.address)` for the reused
// cases would re-persist the whole entity as it was read at resolve time,
// silently clobbering any other field (street, city) a concurrent request
// legitimately changed in the meantime (be#1031 review: lost-update race).
export type AddressWritePlan =
  | { action: "skip" }
  | { action: "patch"; addressId: number; postcodeId: number };

export async function writeVolunteerLegacy(
  volunteer: Volunteer,
  addressWrite?: AddressWritePlan,
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
    // Address — see AddressWritePlan above for why this isn't always a
    // blind full-entity save.
    if (addressWrite?.action === "patch") {
      await addressRepository.update(
        { id: addressWrite.addressId },
        { postcodeId: addressWrite.postcodeId },
      );
    } else if (addressWrite?.action !== "skip") {
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

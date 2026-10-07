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

export interface AddressReusePlan {
  addressId: number;
  postcodeId: number;
}

export async function writeVolunteerLegacy(
  volunteer: Volunteer,
  addressReuse?: AddressReusePlan,
): Promise<number> {
  await dataSource.manager.transaction(async (transactionalEntityManager) => {
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
      const refreshedPerson = await personRepository.findOneByOrFail({
        id: volunteer.person.id,
      });
      volunteer.person.addressId = refreshedPerson.addressId;
    } else {
      await addressRepository.save(volunteer.person.address);
    }

    await personRepository.save(volunteer.person);

    await dealRepository.save(volunteer.deal);
    const dealId = volunteer.deal.id;

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

    await volunteerRepository.save(volunteer);
  });

  return volunteer.id;
}

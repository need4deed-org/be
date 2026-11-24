import { DatabaseError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Person from "../../../data/entity/person.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { updatePersonAddress } from "./update-person-address";

export async function writeVolunteerLegacy(
  volunteer: Volunteer,
  existingPersonPostcodeId?: number,
  auditEntry?: Pick<VolunteerAuditLog, "type" | "detail" | "actorUserId">,
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

    const { person } = volunteer;
    if (existingPersonPostcodeId === undefined) {
      await addressRepository.save(person.address);
      await personRepository.save(person);
    } else {
      const addressId = await updatePersonAddress(
        person.id,
        { postcode: { id: existingPersonPostcodeId } },
        transactionalEntityManager,
      );
      if (!addressId) {
        throw new DatabaseError(`Address not saved for Person ${person.id}.`);
      }
      person.address = await addressRepository.findOneByOrFail({
        id: addressId,
      });
      person.addressId = addressId;
    }

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
    if (auditEntry) {
      await transactionalEntityManager.save(
        new VolunteerAuditLog({
          ...auditEntry,
          volunteerId: volunteer.id,
          occurredAt: new Date(),
        }),
      );
    }
  });

  return volunteer.id;
}

import { OpportunityType } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import Deal from "../../data/entity/deal.entity";
import Postcode from "../../data/entity/location/postcode.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import Person from "../../data/entity/person.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../data/types";

// Minimal volunteer/opportunity rows for status_match tests (be#1106).
export async function createVolunteer(manager: EntityManager) {
  const postcode = await manager.findOneOrFail(Postcode, { where: {} });
  const deal = await manager.save(
    new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
  );
  const person = await manager.save(
    new Person({ firstName: "Match", lastName: "Volunteer" }),
  );
  return manager.save(new Volunteer({ dealId: deal.id, personId: person.id }));
}

export function createOpportunity(manager: EntityManager, title: string) {
  return manager.save(
    new Opportunity({ title, type: OpportunityType.REGULAR }),
  );
}

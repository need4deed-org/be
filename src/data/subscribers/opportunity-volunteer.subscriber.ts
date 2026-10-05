import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from "typeorm";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";

// Recomputes Volunteer/Opportunity.statusMatch whenever a link is saved or
// removed. Runs on the event's EntityManager, i.e. inside the save's own
// transaction, and is awaited — so the recompute sees the row just written and
// a failure surfaces to the caller (be#1106). Entity listeners can't do this:
// they get no manager, so they had to read via a separate connection before
// the transaction committed.
//
// Not fired by repository.delete()/update() (no entity loaded) — callers using
// those must call updateVolunteerMatching/updateOpportunityMatching themselves.
@EventSubscriber()
export class OpportunityVolunteerSubscriber
  implements EntitySubscriberInterface<OpportunityVolunteer>
{
  listenTo() {
    return OpportunityVolunteer;
  }

  afterInsert(event: InsertEvent<OpportunityVolunteer>) {
    return recompute(event.manager, event.entity);
  }

  afterUpdate(event: UpdateEvent<OpportunityVolunteer>) {
    return recompute(event.manager, event.entity ?? event.databaseEntity);
  }

  afterRemove(event: RemoveEvent<OpportunityVolunteer>) {
    return recompute(event.manager, event.entity ?? event.databaseEntity);
  }
}

async function recompute(
  manager: EntityManager,
  link: Partial<OpportunityVolunteer> | undefined,
): Promise<void> {
  if (!link?.volunteerId || !link?.opportunityId) {
    return;
  }

  // Dynamic import: ../utils imports data-source, which registers this
  // subscriber.
  const { updateVolunteerMatching, updateOpportunityMatching } = await import(
    "../utils"
  );
  await updateVolunteerMatching(link.volunteerId, manager);
  await updateOpportunityMatching(link.opportunityId, manager);
}

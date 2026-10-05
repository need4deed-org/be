import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  QueryRunner,
  RemoveEvent,
  UpdateEvent,
} from "typeorm";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import Opportunity from "../entity/opportunity/opportunity.entity";
import Volunteer from "../entity/volunteer/volunteer.entity";

// Recomputes Volunteer/Opportunity.statusMatch whenever a link is saved or
// removed. Runs on the event's EntityManager, i.e. inside the save's own
// transaction, and is awaited — so the recompute sees the row just written and
// a failure surfaces to the caller (be#1106). Entity listeners can't do this:
// they get no manager, so they had to read via a separate connection before
// the transaction committed.
//
// Before the link row is written, its opportunity and then volunteer rows are
// locked (FOR UPDATE), so every link write takes its locks in the order
// opportunity → volunteer → link. The recompute then only touches rows already
// held. applyOnetimerTransition also locks the opportunity before its links,
// so the two queue on the opportunity instead of deadlocking (link held by one,
// opportunity by the other).
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

  beforeInsert(event: InsertEvent<OpportunityVolunteer>) {
    return lockParents(event, event.entity);
  }

  beforeUpdate(event: UpdateEvent<OpportunityVolunteer>) {
    return lockParents(event, event.databaseEntity ?? event.entity);
  }

  beforeRemove(event: RemoveEvent<OpportunityVolunteer>) {
    return lockParents(event, event.databaseEntity ?? event.entity);
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

async function lockParents(
  {
    manager,
    queryRunner,
  }: { manager: EntityManager; queryRunner: QueryRunner },
  link: Partial<OpportunityVolunteer> | undefined,
): Promise<void> {
  // Row locks only last until the transaction ends; outside one (e.g. a save
  // with { transaction: false }) there is nothing to order.
  if (!queryRunner.isTransactionActive) {
    return;
  }

  if (link?.opportunityId) {
    await manager
      .createQueryBuilder(Opportunity, "opportunity")
      .select("opportunity.id")
      .where("opportunity.id = :id", { id: link.opportunityId })
      .setLock("pessimistic_write")
      .getRawOne();
  }
  if (link?.volunteerId) {
    await manager
      .createQueryBuilder(Volunteer, "volunteer")
      .select("volunteer.id")
      .where("volunteer.id = :id", { id: link.volunteerId })
      .setLock("pessimistic_write")
      .getRawOne();
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

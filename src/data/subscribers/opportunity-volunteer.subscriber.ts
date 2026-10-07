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
// Before the link row is written, its parent rows are locked: opportunities
// then volunteers, each by ascending id, covering both the old and the new
// parents when an update moves the link. Every link write therefore takes its
// locks in the order opportunity → volunteer → link, and the recompute only
// touches rows already held. applyOnetimerTransition also locks the
// opportunity before its links, so the two queue on the opportunity instead of
// deadlocking (link held by one, opportunity by the other). FOR NO KEY UPDATE
// is the lock the recompute's UPDATE takes anyway, so it doesn't conflict with
// the KEY SHARE locks of foreign-key checks.
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
    return lockParents(event, parentIds(event.entity));
  }

  beforeUpdate(event: UpdateEvent<OpportunityVolunteer>) {
    return lockParents(
      event,
      parentIds(event.databaseEntity, event.entity ?? undefined),
    );
  }

  beforeRemove(event: RemoveEvent<OpportunityVolunteer>) {
    return lockParents(event, parentIds(event.databaseEntity, event.entity));
  }

  async afterInsert(event: InsertEvent<OpportunityVolunteer>) {
    await recompute(event.manager, parentIds(event.entity));
    await syncEngagement(event.manager, undefined, event.entity);
    await logChange(event, undefined, event.entity);
  }

  async afterUpdate(event: UpdateEvent<OpportunityVolunteer>) {
    await recompute(
      event.manager,
      parentIds(event.databaseEntity, event.entity ?? undefined),
    );
    // Without the previous row (bulk update()) the transition is unknown.
    if (event.databaseEntity) {
      const after = event.entity as Partial<OpportunityVolunteer> | undefined;
      await syncEngagement(event.manager, event.databaseEntity, after);
      await logChange(event, event.databaseEntity, after);
    }
  }

  async afterRemove(event: RemoveEvent<OpportunityVolunteer>) {
    await recompute(
      event.manager,
      parentIds(event.databaseEntity, event.entity),
    );
    await syncEngagement(
      event.manager,
      event.databaseEntity ?? event.entity,
      undefined,
    );
  }
}

interface ParentIds {
  opportunityIds: number[];
  volunteerIds: number[];
}

// Distinct, ascending parent ids of the given link states (old and new).
function parentIds(
  ...links: (Partial<OpportunityVolunteer> | undefined)[]
): ParentIds {
  const ids = (key: "opportunityId" | "volunteerId") =>
    [...new Set(links.map((link) => link?.[key]).filter((id) => !!id))].sort(
      (a, b) => (a as number) - (b as number),
    ) as number[];

  return {
    opportunityIds: ids("opportunityId"),
    volunteerIds: ids("volunteerId"),
  };
}

async function lockParents(
  {
    manager,
    queryRunner,
  }: { manager: EntityManager; queryRunner: QueryRunner },
  { opportunityIds, volunteerIds }: ParentIds,
): Promise<void> {
  // Row locks only last until the transaction ends; outside one (e.g. a save
  // with { transaction: false }) there is nothing to order.
  if (!queryRunner.isTransactionActive) {
    return;
  }

  const lock = (entity: typeof Opportunity | typeof Volunteer, id: number) =>
    manager
      .createQueryBuilder(entity, "parent")
      .select("parent.id")
      .where("parent.id = :id", { id })
      .setLock("for_no_key_update")
      .getRawOne();

  for (const id of opportunityIds) {
    await lock(Opportunity, id);
  }
  for (const id of volunteerIds) {
    await lock(Volunteer, id);
  }
}

async function recompute(
  manager: EntityManager,
  { opportunityIds, volunteerIds }: ParentIds,
): Promise<void> {
  // Dynamic import: ../utils imports data-source, which registers this
  // subscriber.
  const { updateVolunteerMatching, updateOpportunityMatching } = await import(
    "../utils"
  );
  for (const id of volunteerIds) {
    await updateVolunteerMatching(id, manager);
  }
  for (const id of opportunityIds) {
    await updateOpportunityMatching(id, manager);
  }
}

// Writes the volunteer activity-log entry for a created link or a status
// change. Routes pass the acting user as the save's `data.actorUserId`.
async function logChange(
  {
    manager,
    queryRunner,
  }: { manager: EntityManager; queryRunner: QueryRunner },
  before: Partial<OpportunityVolunteer> | undefined,
  after: Partial<OpportunityVolunteer> | undefined,
): Promise<void> {
  const volunteerId = after?.volunteerId ?? before?.volunteerId;
  const opportunityId = after?.opportunityId ?? before?.opportunityId;
  if (!volunteerId || !opportunityId || after?.status === undefined) {
    return;
  }
  const { logMatchChange } = await import("../utils");
  await logMatchChange(manager, {
    volunteerId,
    opportunityId,
    from: before?.status,
    to: after.status,
    actorUserId: (queryRunner.data as { actorUserId?: number } | undefined)
      ?.actorUserId,
  });
}

// Volunteer engagement follows the link entering or leaving Active, on the same
// transaction (the volunteer row is already locked by lockParents).
async function syncEngagement(
  manager: EntityManager,
  before: Partial<OpportunityVolunteer> | undefined,
  after: Partial<OpportunityVolunteer> | undefined,
): Promise<void> {
  const volunteerId = after?.volunteerId ?? before?.volunteerId;
  if (!volunteerId) {
    return;
  }
  const { syncEngagementForMatchChange } = await import(
    "../../server/utils/data/sync-volunteer-engagement"
  );
  await syncEngagementForMatchChange(
    manager,
    volunteerId,
    before?.status,
    after?.status,
  );
}

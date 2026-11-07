import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import ActivityLog from "../../../data/entity/m2m/activity-log.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { lockParents } from "../../../data/subscribers/opportunity-volunteer.subscriber";
import { logMatchChangeSafely } from "../../../data/utils";
import { getVolunteerIdByPersonId } from "./get-volunteer-id-by-person-id";
import { logEngagementChange } from "./sync-volunteer-engagement";

const NOT_STARTED = [
  OpportunityVolunteerStatusType.PENDING,
  OpportunityVolunteerStatusType.MATCHED,
];
const OPEN = [...NOT_STARTED, OpportunityVolunteerStatusType.ACTIVE];

export async function deactivateVolunteerProfile(
  manager: EntityManager,
  personId: number,
  actorUserId: number,
): Promise<void> {
  const queryRunner = manager.queryRunner;
  if (!queryRunner?.isTransactionActive) {
    throw new Error(
      "deactivateVolunteerProfile must run inside a transaction.",
    );
  }
  const volunteerId = await getVolunteerIdByPersonId(personId, manager);
  if (!volunteerId) {
    return;
  }

  const openOpportunityIds = async () =>
    [
      ...new Set(
        (
          await manager.find(OpportunityVolunteer, {
            select: { opportunityId: true },
            where: { volunteerId, status: In(OPEN) },
          })
        ).map(({ opportunityId }) => opportunityId),
      ),
    ].sort((a, b) => a - b);

  const lockedOpportunityIds = await openOpportunityIds();
  await lockParents(
    { manager, queryRunner },
    { opportunityIds: lockedOpportunityIds, volunteerIds: [volunteerId] },
  );
  const lateOpportunityIds = (await openOpportunityIds()).filter(
    (id) => !lockedOpportunityIds.includes(id),
  );
  await lockParents(
    { manager, queryRunner },
    { opportunityIds: lateOpportunityIds, volunteerIds: [] },
  );

  const { statusEngagement: previous } = await manager.findOneOrFail(
    Volunteer,
    {
      select: { id: true, statusEngagement: true },
      where: { id: volunteerId },
    },
  );
  await manager.update(
    Volunteer,
    { id: volunteerId },
    {
      statusEngagement: VolunteerStateEngagementType.INACTIVE,
      dateReturn: null,
    },
  );
  if (previous !== VolunteerStateEngagementType.INACTIVE) {
    await logEngagementChange(
      manager,
      volunteerId,
      previous,
      VolunteerStateEngagementType.INACTIVE,
      actorUserId,
    );
  }

  // FOR UPDATE makes concurrent activity_log inserts wait, so none are cascade-deleted unseen.
  const matches = await manager
    .createQueryBuilder(OpportunityVolunteer, "match")
    .leftJoin("match.opportunity", "opportunity")
    .addSelect(["opportunity.id", "opportunity.title"])
    .where("match.volunteerId = :volunteerId", { volunteerId })
    .andWhere("match.status IN (:...open)", { open: OPEN })
    .orderBy("match.id")
    .setLock("pessimistic_write", undefined, ["match"])
    .getMany();
  if (!matches.length) {
    return;
  }
  const withLoggedHours = new Set(
    (
      await manager.find(ActivityLog, {
        select: { opportunityVolunteerId: true },
        where: { opportunityVolunteerId: In(matches.map(({ id }) => id)) },
      })
    ).map(({ opportunityVolunteerId }) => opportunityVolunteerId),
  );

  const removable: OpportunityVolunteer[] = [];
  const toEnd: OpportunityVolunteer[] = [];
  for (const match of matches) {
    const notStarted = NOT_STARTED.includes(match.status);
    (notStarted && !withLoggedHours.has(match.id) ? removable : toEnd).push(
      match,
    );
  }

  for (const match of toEnd) {
    match.status = OpportunityVolunteerStatusType.PAST;
    await manager.save(match, { data: { actorUserId } });
  }

  const removed = removable.map(({ opportunityId, status, opportunity }) => ({
    opportunityId,
    from: status,
    title: opportunity?.title,
  }));
  await manager.remove(removable);
  for (const change of removed) {
    await logMatchChangeSafely(manager, {
      volunteerId,
      actorUserId,
      ...change,
    });
  }
}

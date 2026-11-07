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
  const volunteer = await manager.findOne(Volunteer, {
    select: { id: true },
    where: { personId },
  });
  if (!volunteer) {
    return;
  }

  const openOpportunityIds = [
    ...new Set(
      (
        await manager.findBy(OpportunityVolunteer, {
          volunteerId: volunteer.id,
          status: In(OPEN),
        })
      ).map(({ opportunityId }) => opportunityId),
    ),
  ].sort((a, b) => a - b);
  await lockParents(
    { manager, queryRunner: manager.queryRunner! },
    { opportunityIds: openOpportunityIds, volunteerIds: [volunteer.id] },
  );

  const { statusEngagement: previous } = await manager.findOneOrFail(
    Volunteer,
    {
      select: { id: true, statusEngagement: true },
      where: { id: volunteer.id },
    },
  );
  await manager.update(
    Volunteer,
    { id: volunteer.id },
    {
      statusEngagement: VolunteerStateEngagementType.INACTIVE,
      dateReturn: null,
    },
  );
  if (previous !== VolunteerStateEngagementType.INACTIVE) {
    await logEngagementChange(
      manager,
      volunteer.id,
      previous,
      VolunteerStateEngagementType.INACTIVE,
      actorUserId,
    );
  }

  if (!openOpportunityIds.length) {
    return;
  }
  // Locking the match rows blocks new activity_log inserts until commit, so no hours are lost to the cascade.
  const matches = await manager
    .createQueryBuilder(OpportunityVolunteer, "match")
    .leftJoin("match.opportunity", "opportunity")
    .addSelect(["opportunity.id", "opportunity.title"])
    .where("match.volunteerId = :volunteerId", { volunteerId: volunteer.id })
    .andWhere("match.opportunityId IN (:...opportunityIds)", {
      opportunityIds: openOpportunityIds,
    })
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
    await manager.save(
      OpportunityVolunteer,
      { id: match.id, status: OpportunityVolunteerStatusType.PAST },
      { data: { actorUserId } },
    );
  }

  const removed = removable.map(({ opportunityId, status, opportunity }) => ({
    opportunityId,
    from: status,
    title: opportunity?.title,
  }));
  await manager.remove(removable, { data: { actorUserId } });
  for (const change of removed) {
    await logMatchChangeSafely(manager, {
      volunteerId: volunteer.id,
      actorUserId,
      ...change,
    });
  }
}

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
  if (previous !== VolunteerStateEngagementType.INACTIVE) {
    await manager.update(
      Volunteer,
      { id: volunteer.id },
      {
        statusEngagement: VolunteerStateEngagementType.INACTIVE,
        dateReturn: null,
      },
    );
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
  const matches = await manager.find(OpportunityVolunteer, {
    where: {
      volunteerId: volunteer.id,
      opportunityId: In(openOpportunityIds),
      status: In(OPEN),
    },
    relations: { opportunity: true },
  });
  const withLoggedHours = new Set(
    (
      await manager.findBy(ActivityLog, {
        opportunityVolunteerId: In(matches.map(({ id }) => id)),
      })
    ).map(({ opportunityVolunteerId }) => opportunityVolunteerId),
  );

  const removable = matches.filter(
    ({ id, status }) =>
      NOT_STARTED.includes(status) && !withLoggedHours.has(id),
  );
  for (const match of matches) {
    if (!removable.includes(match)) {
      await manager.save(
        OpportunityVolunteer,
        { id: match.id, status: OpportunityVolunteerStatusType.PAST },
        { data: { actorUserId } },
      );
    }
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

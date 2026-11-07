import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  logMatchChangeSafely,
  updateOpportunityMatching,
  updateVolunteerMatching,
} from "../../../data/utils";
import { logEngagementChange } from "./sync-volunteer-engagement";

const NOT_STARTED = [
  OpportunityVolunteerStatusType.PENDING,
  OpportunityVolunteerStatusType.MATCHED,
];
const OPEN = [...NOT_STARTED, OpportunityVolunteerStatusType.ACTIVE];

const lockRow = (
  manager: EntityManager,
  entity: typeof Opportunity | typeof Volunteer,
  id: number,
) =>
  manager
    .createQueryBuilder(entity, "row")
    .select("row.id")
    .where("row.id = :id", { id })
    .setLock("for_no_key_update")
    .getRawOne();

export async function deactivateVolunteerProfile(
  manager: EntityManager,
  personId: number,
  actorUserId: number,
): Promise<void> {
  const volunteer = await manager.findOneBy(Volunteer, { personId });
  if (!volunteer) {
    return;
  }

  // Lock order of every link write (OpportunityVolunteerSubscriber): opportunities, then volunteer.
  const openOpportunityIds = (
    await manager.findBy(OpportunityVolunteer, {
      volunteerId: volunteer.id,
      status: In(OPEN),
    })
  )
    .map(({ opportunityId }) => opportunityId)
    .sort((a, b) => a - b);
  for (const id of new Set(openOpportunityIds)) {
    await lockRow(manager, Opportunity, id);
  }
  await lockRow(manager, Volunteer, volunteer.id);

  const { statusEngagement: previous } = await manager.findOneByOrFail(
    Volunteer,
    { id: volunteer.id },
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
    );
  }

  const matches = openOpportunityIds.length
    ? await manager.findBy(OpportunityVolunteer, {
        volunteerId: volunteer.id,
        opportunityId: In(openOpportunityIds),
        status: In(OPEN),
      })
    : [];

  for (const match of matches) {
    if (match.status === OpportunityVolunteerStatusType.ACTIVE) {
      await manager.save(
        OpportunityVolunteer,
        { id: match.id, status: OpportunityVolunteerStatusType.PAST },
        { data: { actorUserId } },
      );
    }
  }

  const notStarted = matches.filter(({ status }) =>
    NOT_STARTED.includes(status),
  );
  if (!notStarted.length) {
    return;
  }
  await manager.delete(OpportunityVolunteer, {
    id: In(notStarted.map(({ id }) => id)),
  });
  for (const match of notStarted) {
    await logMatchChangeSafely(manager, {
      volunteerId: volunteer.id,
      opportunityId: match.opportunityId,
      from: match.status,
      actorUserId,
    });
  }
  for (const id of new Set(
    notStarted.map(({ opportunityId }) => opportunityId),
  )) {
    await updateOpportunityMatching(id, manager);
  }
  await updateVolunteerMatching(volunteer.id, manager);
}

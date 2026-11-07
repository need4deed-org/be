import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  updateOpportunityMatching,
  updateVolunteerMatching,
} from "../../../data/utils";
import { deleteMatch, logEngagementChange } from "./sync-volunteer-engagement";

const NOT_STARTED = [
  OpportunityVolunteerStatusType.PENDING,
  OpportunityVolunteerStatusType.MATCHED,
];

export async function deactivateVolunteerProfile(
  manager: EntityManager,
  personId: number,
  actorUserId: number,
): Promise<void> {
  const volunteer = await manager.findOneBy(Volunteer, { personId });
  if (!volunteer) {
    return;
  }

  const matches = await manager.findBy(OpportunityVolunteer, {
    volunteerId: volunteer.id,
    status: In([...NOT_STARTED, OpportunityVolunteerStatusType.ACTIVE]),
  });

  for (const match of matches) {
    if (match.status === OpportunityVolunteerStatusType.ACTIVE) {
      await manager.save(
        OpportunityVolunteer,
        { id: match.id, status: OpportunityVolunteerStatusType.PAST },
        { data: { actorUserId } },
      );
    } else {
      await deleteMatch(manager, match, actorUserId);
    }
  }

  for (const opportunityId of new Set(matches.map((m) => m.opportunityId))) {
    await updateOpportunityMatching(opportunityId, manager);
  }
  await updateVolunteerMatching(volunteer.id, manager);

  const { statusEngagement: previous } = await manager.findOneByOrFail(
    Volunteer,
    { id: volunteer.id },
  );
  if (previous !== VolunteerStateEngagementType.INACTIVE) {
    await manager.update(
      Volunteer,
      { id: volunteer.id },
      { statusEngagement: VolunteerStateEngagementType.INACTIVE },
    );
    await logEngagementChange(
      manager,
      volunteer.id,
      previous,
      VolunteerStateEngagementType.INACTIVE,
    );
  }
}

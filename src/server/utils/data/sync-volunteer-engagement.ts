import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";

// "Active" engagement follows the volunteer's matches (same rule as fe#1123):
// Active while any match is active, back to Available once none is. A status a
// coordinator set by hand is only replaced when a match becomes active.
export async function syncVolunteerEngagement(
  manager: EntityManager,
  volunteerId: number,
): Promise<void> {
  const hasActiveMatch = await manager.exists(OpportunityVolunteer, {
    where: { volunteerId, status: OpportunityVolunteerStatusType.ACTIVE },
  });

  if (hasActiveMatch) {
    await manager.update(
      Volunteer,
      { id: volunteerId },
      {
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
        dateReturn: null,
      },
    );
    return;
  }

  await manager.update(
    Volunteer,
    { id: volunteerId, statusEngagement: VolunteerStateEngagementType.ACTIVE },
    { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
  );
}

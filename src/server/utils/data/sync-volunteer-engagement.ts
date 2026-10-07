import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";

export async function syncVolunteerEngagement(
  manager: EntityManager,
  volunteerId: number,
): Promise<void> {
  const hasActiveMatch = await manager.exists(OpportunityVolunteer, {
    where: { volunteerId, status: OpportunityVolunteerStatusType.ACTIVE },
  });

  if (hasActiveMatch) {
    const previous = await manager.findOne(Volunteer, {
      select: { id: true, statusEngagement: true },
      where: { id: volunteerId },
    });
    await manager.update(
      Volunteer,
      { id: volunteerId },
      {
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
        dateReturn: null,
      },
    );
    if (
      previous &&
      previous.statusEngagement !== VolunteerStateEngagementType.ACTIVE
    ) {
      await logEngagementChange(
        manager,
        volunteerId,
        previous.statusEngagement,
        VolunteerStateEngagementType.ACTIVE,
      );
    }
    return;
  }

  const { affected } = await manager.update(
    Volunteer,
    { id: volunteerId, statusEngagement: VolunteerStateEngagementType.ACTIVE },
    { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
  );
  if (affected) {
    await logEngagementChange(
      manager,
      volunteerId,
      VolunteerStateEngagementType.ACTIVE,
      VolunteerStateEngagementType.AVAILABLE,
    );
  }
}

async function logEngagementChange(
  manager: EntityManager,
  volunteerId: number,
  from: VolunteerStateEngagementType,
  to: VolunteerStateEngagementType,
): Promise<void> {
  await manager.save(
    VolunteerAuditLog,
    new VolunteerAuditLog({
      volunteerId,
      type: "availability_changed",
      detail: `Status changed from ${from} to ${to}.`,
      occurredAt: new Date(),
    }),
  );
}

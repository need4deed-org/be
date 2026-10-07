import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { logMatchChangeSafely } from "../../../data/utils/log-match-change";

export async function syncVolunteerEngagement(
  manager: EntityManager,
  volunteerId: number,
  mode: "follow" | "release" = "follow",
): Promise<void> {
  const hasActiveMatch = await manager.exists(OpportunityVolunteer, {
    where: { volunteerId, status: OpportunityVolunteerStatusType.ACTIVE },
  });

  if (hasActiveMatch && mode === "release") {
    return;
  }
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

export async function syncEngagementForMatchChange(
  manager: EntityManager,
  volunteerId: number,
  from: OpportunityVolunteerStatusType | undefined,
  to: OpportunityVolunteerStatusType | undefined,
): Promise<void> {
  const isActive = OpportunityVolunteerStatusType.ACTIVE;
  if (to === isActive && from !== isActive) {
    await syncVolunteerEngagement(manager, volunteerId, "follow");
  } else if (from === isActive && to !== isActive) {
    await syncVolunteerEngagement(manager, volunteerId, "release");
  }
}

// Deletes a match, releases engagement and logs the removal in one transaction,
// with the volunteer row locked like OpportunityVolunteerSubscriber does. The
// status comes from the delete itself, so a concurrent change can't make it stale.
export async function deleteMatch(
  manager: EntityManager,
  match: Pick<OpportunityVolunteer, "id" | "volunteerId" | "opportunityId">,
  actorUserId?: number,
): Promise<boolean> {
  return manager.transaction(async (tx) => {
    await tx
      .createQueryBuilder(Volunteer, "volunteer")
      .select("volunteer.id")
      .where("volunteer.id = :id", { id: match.volunteerId })
      .setLock("for_no_key_update")
      .getRawOne();
    const { raw } = await tx
      .createQueryBuilder()
      .delete()
      .from(OpportunityVolunteer)
      .where("id = :id", { id: match.id })
      .returning(["status"])
      .execute();
    const deleted = (raw as { status: OpportunityVolunteerStatusType }[])[0];
    if (!deleted) {
      return false;
    }
    await syncEngagementForMatchChange(
      tx,
      match.volunteerId,
      deleted.status,
      undefined,
    );
    await logMatchChangeSafely(tx, {
      volunteerId: match.volunteerId,
      opportunityId: match.opportunityId,
      from: deleted.status,
      actorUserId,
    });
    return true;
  });
}

import { FastifyInstance } from "fastify";
import {
  berlinToday,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import logger from "../../logger";
import {
  matchExistsSql,
  onetimerActiveSince,
} from "../../server/utils/data/onetimer-active-period";
import { ONETIMER_OPPORTUNITY_TYPES } from "../../server/utils/data/onetimer-statuses";
import { logEngagementChange } from "../../server/utils/data/sync-volunteer-engagement";
import { addDays } from "./berlin-dates";

// A volunteer whose hold lapsed longer ago than this is left alone, so a
// coordinator who later sets them Active by hand isn't overridden every day.
const CATCH_UP_DAYS = 7;

export async function releaseLapsedOnetimerEngagement(
  fastify: FastifyInstance,
  today: Date = berlinToday(),
): Promise<void> {
  const released = await fastify.db.volunteerRepository.manager.transaction(
    async (manager) => {
      const { raw } = await manager
        .createQueryBuilder()
        .update(Volunteer)
        .set({ statusEngagement: VolunteerStateEngagementType.AVAILABLE })
        .where("status_engagement = :activeEngagement")
        .andWhere(
          `NOT EXISTS (
            SELECT 1 FROM opportunity_volunteer ov
            WHERE ov.volunteer_id = volunteer.id AND ov.status = :activeMatch
          )`,
        )
        .andWhere(
          matchExistsSql("volunteer.id", {
            status: "pastMatch",
            onetimer: true,
            onetimerSince: "lapsedSince",
          }),
        )
        .andWhere(
          `NOT ${matchExistsSql("volunteer.id", {
            status: "pastMatch",
            onetimer: true,
            onetimerSince: "activeSince",
          })}`,
        )
        .setParameters({
          activeEngagement: VolunteerStateEngagementType.ACTIVE,
          activeMatch: OpportunityVolunteerStatusType.ACTIVE,
          pastMatch: OpportunityVolunteerStatusType.PAST,
          onetimerTypes: ONETIMER_OPPORTUNITY_TYPES,
          activeSince: onetimerActiveSince(today),
          lapsedSince: onetimerActiveSince(addDays(today, -CATCH_UP_DAYS)),
        })
        .returning(["id"])
        .execute();
      const ids = (raw as { id: number }[]).map(({ id }) => id);
      for (const volunteerId of ids) {
        await logEngagementChange(
          manager,
          volunteerId,
          VolunteerStateEngagementType.ACTIVE,
          VolunteerStateEngagementType.AVAILABLE,
        );
      }
      return ids.length;
    },
  );

  if (released) {
    logger.info(
      `releaseLapsedOnetimerEngagement: released ${released} volunteer(s)`,
    );
  }
}

import {
  EntityTableName,
  TimedTextType,
  VolunteerLeadFromChange,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import LeadFrom from "../../../data/entity/lead.entity";
import StatisticsEvent, {
  LEAD_FROM_METRIC,
} from "../../../data/entity/statistics-event.entity";
import Timeline from "../../../data/entity/timeline.entity";
import VolunteerLeadFrom from "../../../data/entity/volunteer/volunteer-lead-from.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";

export async function saveVolunteerLeadFrom(
  manager: EntityManager,
  volunteer: Volunteer,
  leadFromId: number,
  countInStatistics: boolean,
): Promise<VolunteerLeadFrom> {
  let statisticsEventId: number | null = null;
  if (countInStatistics) {
    const event = await manager.save(
      new StatisticsEvent({
        metric: LEAD_FROM_METRIC,
        valueKey: String(leadFromId),
        occurredAt: volunteer.createdAt,
      }),
    );
    statisticsEventId = event.id;
    await manager.increment(LeadFrom, { id: leadFromId }, "count", 1);
  }
  return manager.save(
    manager.create(VolunteerLeadFrom, {
      volunteerId: volunteer.id,
      leadFromId,
      statisticsEventId,
    }),
  );
}

export async function changeVolunteerLeadFrom(
  volunteerId: number,
  actorUserId: number,
  changes: VolunteerLeadFromChange[],
  entityManager = dataSource.manager,
): Promise<void> {
  if (!changes.length) {
    return;
  }
  await entityManager.transaction(async (manager) => {
    const volunteer = await manager.findOneOrFail(Volunteer, {
      where: { id: volunteerId },
      lock: { mode: "pessimistic_write" },
    });
    const answers = new Map(
      (await manager.findBy(VolunteerLeadFrom, { volunteerId })).map(
        (answer) => [answer.leadFromId, answer],
      ),
    );
    const optionIds = [
      ...new Set(
        changes.flatMap((change) =>
          change.action === "correct"
            ? [change.optionId, change.previousOptionId]
            : [change.optionId],
        ),
      ),
    ];
    const options = await manager.find(LeadFrom, {
      where: { id: In(optionIds) },
      order: { id: "ASC" },
      lock: { mode: "pessimistic_write" },
    });
    if (options.length !== optionIds.length) {
      throw new BadRequestError("Unknown lead source option.");
    }

    const cutoff = process.env.VOLUNTEER_LEAD_FROM_LAUNCH_AT;
    const launchAt = cutoff ? Date.parse(cutoff) : NaN;
    if (
      changes.some(({ action }) => action === "add") &&
      !Number.isFinite(launchAt)
    ) {
      throw new Error("VOLUNTEER_LEAD_FROM_LAUNCH_AT must be configured.");
    }
    for (const change of changes) {
      const { optionId, action } = change;
      if (action !== "remove" && answers.has(optionId)) {
        throw new BadRequestError("Lead source is already saved.");
      }
      if (action === "add") {
        const answer = await saveVolunteerLeadFrom(
          manager,
          volunteer,
          optionId,
          volunteer.createdAt.getTime() >= launchAt,
        );
        answers.set(optionId, answer);
        continue;
      }

      const previousOptionId =
        action === "correct" ? change.previousOptionId : optionId;
      const answer = answers.get(previousOptionId);
      if (!answer) {
        throw new BadRequestError("Lead source is not saved.");
      }
      await manager.delete(VolunteerLeadFrom, {
        volunteerId,
        leadFromId: previousOptionId,
      });
      answers.delete(previousOptionId);
      if (action === "correct") {
        answers.set(
          optionId,
          await manager.save(
            manager.create(VolunteerLeadFrom, {
              volunteerId,
              leadFromId: optionId,
              statisticsEventId: answer.statisticsEventId,
            }),
          ),
        );
      }
      if (answer.statisticsEventId !== null) {
        await manager.decrement(LeadFrom, { id: previousOptionId }, "count", 1);
        if (action === "correct") {
          await manager.update(StatisticsEvent, answer.statisticsEventId, {
            valueKey: String(optionId),
          });
          await manager.increment(LeadFrom, { id: optionId }, "count", 1);
        } else {
          await manager.delete(StatisticsEvent, answer.statisticsEventId);
        }
      }
    }

    const latest = await manager.findOne(Timeline, {
      where: {
        targetEntityType: EntityTableName.VOLUNTEER,
        targetEntityId: volunteerId,
      },
      order: { timestamp: "DESC" },
    });
    const firstTimestamp = Math.max(
      Date.now(),
      (latest?.timestamp.getTime() ?? 0) + 1,
    );
    await manager.insert(
      Timeline,
      changes.map(({ action, optionId }, index) => ({
        targetEntityType: EntityTableName.VOLUNTEER,
        targetEntityId: volunteerId,
        contentEntityType: EntityTableName.LEAD,
        contentEntityId: optionId,
        contentType:
          action === "add"
            ? TimedTextType.CREATE
            : action === "correct"
              ? TimedTextType.UPDATE
              : TimedTextType.REMOVE,
        timestamp: new Date(firstTimestamp + index),
        content: `Lead source ${action} by user #${actorUserId}.`,
      })),
    );
  });
}

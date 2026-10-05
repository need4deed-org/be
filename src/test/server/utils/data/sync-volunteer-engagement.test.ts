import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OpportunityVolunteer from "../../../../data/entity/m2m/opportunity-volunteer";
import VolunteerAuditLog from "../../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../../data/entity/volunteer/volunteer.entity";
import { syncVolunteerEngagement } from "../../../../server/utils/data/sync-volunteer-engagement";

const exists = vi.fn();
const update = vi.fn();
const findOne = vi.fn();
const save = vi.fn();
const manager = { exists, update, findOne, save } as unknown as EntityManager;

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({ affected: 1 });
  findOne.mockResolvedValue({
    id: 7,
    statusEngagement: VolunteerStateEngagementType.UNRESPONSIVE,
  });
});

describe("syncVolunteerEngagement", () => {
  it("sets Active (and clears the return date) when the volunteer has an active match", async () => {
    exists.mockResolvedValue(true);

    await syncVolunteerEngagement(manager, 7);

    expect(exists).toHaveBeenCalledWith(OpportunityVolunteer, {
      where: { volunteerId: 7, status: OpportunityVolunteerStatusType.ACTIVE },
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      Volunteer,
      { id: 7 },
      {
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
        dateReturn: null,
      },
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      VolunteerAuditLog,
      expect.objectContaining({
        volunteerId: 7,
        type: "availability_changed",
        detail: `Status changed from ${VolunteerStateEngagementType.UNRESPONSIVE} to ${VolunteerStateEngagementType.ACTIVE}.`,
        actorUserId: undefined,
      }),
    );
  });

  it("writes no audit row when the volunteer was already Active", async () => {
    exists.mockResolvedValue(true);
    findOne.mockResolvedValue({
      id: 7,
      statusEngagement: VolunteerStateEngagementType.ACTIVE,
    });

    await syncVolunteerEngagement(manager, 7);

    expect(update).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it("moves Active to Available when no match is active, without touching other statuses", async () => {
    exists.mockResolvedValue(false);

    await syncVolunteerEngagement(manager, 7);

    expect(update).toHaveBeenCalledTimes(1);
    // The where clause only matches a volunteer whose stored status is Active,
    // so a status a coordinator set by hand (e.g. Unresponsive) stays as it is.
    expect(update).toHaveBeenCalledWith(
      Volunteer,
      { id: 7, statusEngagement: VolunteerStateEngagementType.ACTIVE },
      { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
    );
    expect(save).toHaveBeenCalledWith(
      VolunteerAuditLog,
      expect.objectContaining({
        volunteerId: 7,
        type: "availability_changed",
        detail: `Status changed from ${VolunteerStateEngagementType.ACTIVE} to ${VolunteerStateEngagementType.AVAILABLE}.`,
      }),
    );
  });

  it("writes no audit row when the volunteer wasn't Active", async () => {
    exists.mockResolvedValue(false);
    update.mockResolvedValue({ affected: 0 });

    await syncVolunteerEngagement(manager, 7);

    expect(save).not.toHaveBeenCalled();
  });
});

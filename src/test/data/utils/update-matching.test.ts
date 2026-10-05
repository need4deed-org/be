import {
  OpportunityMatchStatusType,
  OpportunityVolunteerStatusType,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { describe, expect, it } from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import {
  updateOpportunityMatching,
  updateVolunteerMatching,
} from "../../../data/utils";

// be#1106 review. Inside a transaction a failed save has already aborted it in
// Postgres; swallowing the error would let the caller's COMMIT silently roll
// back, so it must propagate.
const managerWithFailingSave = (current: string) =>
  ({
    getRepository: (entity: unknown) =>
      entity === OpportunityVolunteer
        ? {
            find: async () => [
              { status: OpportunityVolunteerStatusType.PENDING },
            ],
          }
        : {
            findOneBy: async () => ({ id: 1, statusMatch: current }),
            save: async () => {
              throw new Error("deadlock detected");
            },
          },
  }) as unknown as EntityManager;

describe("update*Matching with a transaction manager", () => {
  it("rethrows a failed volunteer save", async () => {
    await expect(
      updateVolunteerMatching(
        1,
        managerWithFailingSave(VolunteerStateMatchType.NO_MATCHES),
      ),
    ).rejects.toThrow("deadlock detected");
  });

  it("rethrows a failed opportunity save", async () => {
    await expect(
      updateOpportunityMatching(
        1,
        managerWithFailingSave(OpportunityMatchStatusType.NO_MATCHES),
      ),
    ).rejects.toThrow("deadlock detected");
  });
});

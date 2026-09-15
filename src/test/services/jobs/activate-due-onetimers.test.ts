import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { activateDueOnetimers } from "../../../services/jobs/activate-due-onetimers";

const loggerErrorMock = vi.fn();
const loggerInfoMock = vi.fn();
vi.mock("../../../logger", () => ({
  default: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    info: (...args: unknown[]) => loggerInfoMock(...args),
  },
}));

const getMany = vi.fn();
const managerSave = vi.fn();

const qbMock = {
  leftJoinAndSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  getMany,
};

// Runs the transaction callback against a fake EntityManager whose save()
// delegates to the managerSave mock — good enough to assert what was written
// and to simulate a mid-transaction failure without a real DB.
const transaction = vi.fn(
  async (cb: (manager: EntityManager) => Promise<void>) =>
    cb({
      save: (...args: unknown[]) => managerSave(...args),
    } as unknown as EntityManager),
);

const fastify = {
  db: {
    opportunityRepository: {
      createQueryBuilder: vi.fn(() => qbMock),
      manager: { transaction },
    },
  },
} as unknown as FastifyInstance;

function buildOpportunity(
  id: number,
  ovs: Partial<OpportunityVolunteer>[],
): Opportunity {
  return new Opportunity({
    id,
    status: OpportunityStatusType.SEARCHING,
    opportunityVolunteer: ovs.map((ov) => new OpportunityVolunteer(ov)),
  } as Partial<Opportunity>);
}

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (cb) =>
    cb({
      save: (...args: unknown[]) => managerSave(...args),
    } as unknown as EntityManager),
  );
  managerSave.mockImplementation(async (_entity: unknown, obj: unknown) => obj);
});

describe("activateDueOnetimers", () => {
  it("does nothing when there are no opportunities due today", async () => {
    getMany.mockResolvedValue([]);

    await activateDueOnetimers(fastify);

    expect(transaction).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it("activates opportunities due today with a matched volunteer", async () => {
    const matched = { id: 1, status: OpportunityVolunteerStatusType.MATCHED };
    const opportunity = buildOpportunity(10, [matched]);
    getMany.mockResolvedValue([opportunity]);

    await activateDueOnetimers(fastify);

    expect(qbMock.andWhere).toHaveBeenCalledWith(
      "opportunity.status NOT IN (:...terminalStatuses)",
      {
        terminalStatuses: [
          OpportunityStatusType.ACTIVE,
          OpportunityStatusType.INACTIVE,
          OpportunityStatusType.PAST,
        ],
      },
    );
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      "opportunityVolunteer.status = :matched",
      { matched: OpportunityVolunteerStatusType.MATCHED },
    );

    expect(opportunity.status).toBe(OpportunityStatusType.ACTIVE);
    expect(managerSave).toHaveBeenCalledWith(Opportunity, opportunity);

    expect(opportunity.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(managerSave).toHaveBeenCalledWith(
      OpportunityVolunteer,
      opportunity.opportunityVolunteer[0],
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("processed 1 due opportunities"),
    );
  });

  it("keeps processing remaining opportunities when one's transaction fails", async () => {
    const failing = buildOpportunity(1, [
      { id: 1, status: OpportunityVolunteerStatusType.MATCHED },
    ]);
    const succeeding = buildOpportunity(2, [
      { id: 2, status: OpportunityVolunteerStatusType.MATCHED },
    ]);
    getMany.mockResolvedValue([failing, succeeding]);

    // Fails on the very first save of the run — the opportunity save for
    // `failing` — before its transaction ever reaches the volunteer save.
    managerSave.mockImplementationOnce(async () => {
      throw new Error("db unavailable");
    });

    await activateDueOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: 1 }),
      expect.stringContaining(
        "failed to activate opportunity and its volunteer(s)",
      ),
    );

    // The failing opportunity's volunteer must not have been touched.
    expect(managerSave).not.toHaveBeenCalledWith(
      OpportunityVolunteer,
      failing.opportunityVolunteer[0],
    );
    expect(failing.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );

    // The second opportunity is still processed despite the first one failing.
    expect(succeeding.status).toBe(OpportunityStatusType.ACTIVE);
    expect(succeeding.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
  });

  it("be#988: rolls back the whole opportunity when one volunteer save fails, instead of partially applying it", async () => {
    const first = { id: 1, status: OpportunityVolunteerStatusType.MATCHED };
    const second = { id: 2, status: OpportunityVolunteerStatusType.MATCHED };
    const opportunity = buildOpportunity(1, [first, second]);
    getMany.mockResolvedValue([opportunity]);

    managerSave.mockImplementation(async (entity: unknown, obj: unknown) => {
      if (entity === OpportunityVolunteer && (obj as { id: number }).id === 1) {
        throw new Error("db unavailable");
      }
      return obj;
    });

    await activateDueOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: opportunity.id }),
      expect.stringContaining(
        "failed to activate opportunity and its volunteer(s)",
      ),
    );

    // The transaction aborts as soon as the first volunteer's save throws —
    // the second volunteer's save is never even attempted, proving this is
    // all-or-nothing per opportunity rather than best-effort per volunteer.
    expect(managerSave).not.toHaveBeenCalledWith(
      OpportunityVolunteer,
      opportunity.opportunityVolunteer[1],
    );
    expect(opportunity.opportunityVolunteer[1].status).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });
});

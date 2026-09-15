import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { scanExpiredOnetimers } from "../../../services/jobs/scan-expired-onetimers";

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
    status: OpportunityStatusType.ACTIVE,
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

describe("scanExpiredOnetimers", () => {
  it("does nothing when there are no expired opportunities", async () => {
    getMany.mockResolvedValue([]);

    await scanExpiredOnetimers(fastify);

    expect(transaction).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it("queries with the terminal-status and date-window guards", async () => {
    getMany.mockResolvedValue([]);

    await scanExpiredOnetimers(fastify);

    expect(qbMock.andWhere).toHaveBeenCalledWith(
      "opportunity.status NOT IN (:...terminalStatuses)",
      {
        terminalStatuses: [
          OpportunityStatusType.INACTIVE,
          OpportunityStatusType.PAST,
        ],
      },
    );
    expect(qbMock.andWhere).toHaveBeenCalledWith("onetimer.date < :yesterday", {
      yesterday: expect.any(Date),
    });
  });

  it("marks expired opportunities with a matched volunteer PAST, and flips that volunteer to PAST", async () => {
    const matched = { id: 1, status: OpportunityVolunteerStatusType.MATCHED };
    const pending = { id: 2, status: OpportunityVolunteerStatusType.PENDING };
    const opportunity = buildOpportunity(10, [matched, pending]);
    getMany.mockResolvedValue([opportunity]);

    await scanExpiredOnetimers(fastify);

    expect(opportunity.status).toBe(OpportunityStatusType.PAST);
    expect(managerSave).toHaveBeenCalledWith(Opportunity, opportunity);

    expect(opportunity.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
    expect(managerSave).toHaveBeenCalledWith(
      OpportunityVolunteer,
      opportunity.opportunityVolunteer[0],
    );
    expect(opportunity.opportunityVolunteer[1].status).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
    expect(managerSave).not.toHaveBeenCalledWith(
      OpportunityVolunteer,
      opportunity.opportunityVolunteer[1],
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("processed 1 expired opportunities"),
    );
  });

  it("be#987 review: also finalizes an already-ACTIVE volunteer (activated by activateDueOnetimers) to PAST, not just MATCHED", async () => {
    const active = { id: 1, status: OpportunityVolunteerStatusType.ACTIVE };
    const opportunity = buildOpportunity(10, [active]);
    getMany.mockResolvedValue([opportunity]);

    await scanExpiredOnetimers(fastify);

    expect(opportunity.status).toBe(OpportunityStatusType.PAST);
    expect(opportunity.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
    expect(managerSave).toHaveBeenCalledWith(
      OpportunityVolunteer,
      opportunity.opportunityVolunteer[0],
    );
  });

  it("marks expired opportunities with no matched/active volunteer INACTIVE", async () => {
    const pending = { id: 2, status: OpportunityVolunteerStatusType.PENDING };
    const opportunity = buildOpportunity(11, [pending]);
    getMany.mockResolvedValue([opportunity]);

    await scanExpiredOnetimers(fastify);

    expect(opportunity.status).toBe(OpportunityStatusType.INACTIVE);
    expect(managerSave).toHaveBeenCalledWith(Opportunity, opportunity);
    expect(managerSave).not.toHaveBeenCalledWith(
      OpportunityVolunteer,
      expect.anything(),
    );
    expect(opportunity.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.PENDING,
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

    await scanExpiredOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: 1 }),
      expect.stringContaining(
        "failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
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
    expect(succeeding.status).toBe(OpportunityStatusType.PAST);
    expect(succeeding.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
  });

  it("rolls back the whole opportunity when one volunteer save fails, instead of partially applying it", async () => {
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

    await scanExpiredOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: opportunity.id,
        opportunityVolunteerIds: [first.id, second.id],
      }),
      expect.stringContaining(
        "failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
      ),
    );

    // The transaction aborts as soon as the first volunteer's save throws —
    // the second volunteer's save is never even attempted.
    expect(managerSave).not.toHaveBeenCalledWith(
      OpportunityVolunteer,
      opportunity.opportunityVolunteer[1],
    );
    expect(opportunity.opportunityVolunteer[1].status).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });
});

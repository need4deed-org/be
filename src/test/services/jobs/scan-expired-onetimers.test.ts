import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
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
const opportunityRepositorySave = vi.fn();
const opportunityVolunteerRepositorySave = vi.fn();

const qbMock = {
  leftJoinAndSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  getMany,
};

const fastify = {
  db: {
    opportunityRepository: {
      createQueryBuilder: vi.fn(() => qbMock),
      save: (...args: unknown[]) => opportunityRepositorySave(...args),
    },
    opportunityVolunteerRepository: {
      save: (...args: unknown[]) => opportunityVolunteerRepositorySave(...args),
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
  opportunityRepositorySave.mockImplementation(
    async (opportunity: Opportunity) => opportunity,
  );
  opportunityVolunteerRepositorySave.mockImplementation(
    async (ov: OpportunityVolunteer) => ov,
  );
});

describe("scanExpiredOnetimers", () => {
  it("does nothing when there are no expired opportunities", async () => {
    getMany.mockResolvedValue([]);

    await scanExpiredOnetimers(fastify);

    expect(opportunityRepositorySave).not.toHaveBeenCalled();
    expect(opportunityVolunteerRepositorySave).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it("marks expired opportunities INACTIVE and flips matched volunteers to PAST", async () => {
    const matched = { id: 1, status: OpportunityVolunteerStatusType.MATCHED };
    const pending = { id: 2, status: OpportunityVolunteerStatusType.PENDING };
    const opportunity = buildOpportunity(10, [matched, pending]);
    getMany.mockResolvedValue([opportunity]);

    await scanExpiredOnetimers(fastify);

    expect(opportunity.status).toBe(OpportunityStatusType.INACTIVE);
    expect(opportunityRepositorySave).toHaveBeenCalledWith(opportunity);

    expect(opportunityVolunteerRepositorySave).toHaveBeenCalledTimes(1);
    expect(opportunity.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
    expect(opportunity.opportunityVolunteer[1].status).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("marked 1 opportunities as INACTIVE"),
    );
  });

  it("keeps processing remaining opportunities when one fails to save", async () => {
    const failing = buildOpportunity(1, [
      { id: 1, status: OpportunityVolunteerStatusType.MATCHED },
    ]);
    const succeeding = buildOpportunity(2, [
      { id: 2, status: OpportunityVolunteerStatusType.MATCHED },
    ]);
    getMany.mockResolvedValue([failing, succeeding]);

    opportunityRepositorySave.mockImplementationOnce(async () => {
      throw new Error("db unavailable");
    });

    await scanExpiredOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: 1 }),
      expect.stringContaining("failed to mark opportunity as INACTIVE"),
    );

    // The failing opportunity's volunteer must not have been touched.
    expect(failing.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );

    // The second opportunity is still processed despite the first one failing.
    expect(succeeding.status).toBe(OpportunityStatusType.INACTIVE);
    expect(succeeding.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
  });

  it("keeps processing remaining volunteers when one volunteer save fails", async () => {
    const first = { id: 1, status: OpportunityVolunteerStatusType.MATCHED };
    const second = { id: 2, status: OpportunityVolunteerStatusType.MATCHED };
    const opportunity = buildOpportunity(1, [first, second]);
    getMany.mockResolvedValue([opportunity]);

    opportunityVolunteerRepositorySave.mockImplementationOnce(async () => {
      throw new Error("db unavailable");
    });

    await scanExpiredOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: opportunity.id,
        opportunityVolunteerId: 1,
      }),
      expect.stringContaining("failed to mark opportunity volunteer as PAST"),
    );

    // Second volunteer still gets updated despite the first one failing.
    expect(opportunity.opportunityVolunteer[1].status).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
    expect(opportunity.status).toBe(OpportunityStatusType.INACTIVE);
  });
});

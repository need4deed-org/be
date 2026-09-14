import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
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
    status: OpportunityStatusType.SEARCHING,
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

describe("activateDueOnetimers", () => {
  it("does nothing when there are no opportunities due today", async () => {
    getMany.mockResolvedValue([]);

    await activateDueOnetimers(fastify);

    expect(opportunityRepositorySave).not.toHaveBeenCalled();
    expect(opportunityVolunteerRepositorySave).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it("activates opportunities due today with a matched volunteer", async () => {
    const matched = { id: 1, status: OpportunityVolunteerStatusType.MATCHED };
    const opportunity = buildOpportunity(10, [matched]);
    getMany.mockResolvedValue([opportunity]);

    await activateDueOnetimers(fastify);

    expect(opportunity.status).toBe(OpportunityStatusType.ACTIVE);
    expect(opportunityRepositorySave).toHaveBeenCalledWith(opportunity);

    expect(opportunityVolunteerRepositorySave).toHaveBeenCalledTimes(1);
    expect(opportunity.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("activated 1 opportunities"),
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

    await activateDueOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: 1 }),
      expect.stringContaining("failed to mark opportunity as ACTIVE"),
    );

    // The failing opportunity's volunteer must not have been touched.
    expect(failing.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );

    // The second opportunity is still processed despite the first one failing.
    expect(succeeding.status).toBe(OpportunityStatusType.ACTIVE);
    expect(succeeding.opportunityVolunteer[0].status).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
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

    await activateDueOnetimers(fastify);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: opportunity.id,
        opportunityVolunteerId: 1,
      }),
      expect.stringContaining("failed to mark opportunity volunteer as ACTIVE"),
    );

    // Second volunteer still gets updated despite the first one failing.
    expect(opportunity.opportunityVolunteer[1].status).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(opportunity.status).toBe(OpportunityStatusType.ACTIVE);
  });
});

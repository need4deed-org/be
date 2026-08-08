import { OpportunityStatusType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import { writeOpportunityLegacy } from "../../../../server/utils/data/write-opportunity-legacy";

const setAgentSearchingMock = vi.fn();
vi.mock("../../../../server/utils/data/for-routes", () => ({
  impliesAgentSearching: (status: OpportunityStatusType) =>
    [
      OpportunityStatusType.NEW,
      OpportunityStatusType.ACTIVE,
      OpportunityStatusType.SEARCHING,
    ].includes(status),
  setAgentSearching: (...args: unknown[]) => setAgentSearchingMock(...args),
}));

const txnManager: any = {
  getRepository: () => ({ save: vi.fn().mockResolvedValue(undefined) }),
};
vi.mock("../../../../data/data-source", () => ({
  dataSource: {
    manager: { transaction: async (cb: any) => cb(txnManager) },
  },
}));

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return new Opportunity({
    id: 1,
    deal: {
      dealActivity: [],
      dealSkill: [],
      dealLanguage: [],
      dealTimeslot: [],
      dealDistrict: [],
    } as any,
    ...overrides,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// Regression tests for be#868 review: the be#862 search-status cascade must
// respect the opportunity's actual status (rather than assuming every create
// implies searching) and must not blow up when there's no owning agent.
describe("writeOpportunityLegacy cascades Agent.volunteerSearch (be#862/be#868)", () => {
  it("cascades when status is left unset (defaults to NEW, which implies searching)", async () => {
    const opportunity = makeOpportunity({ agentId: 42 });

    await writeOpportunityLegacy(opportunity);

    expect(setAgentSearchingMock).toHaveBeenCalledWith(42, txnManager);
  });

  it("does not cascade when created with a status that doesn't imply searching", async () => {
    const opportunity = makeOpportunity({
      agentId: 42,
      status: OpportunityStatusType.INACTIVE,
    });

    await writeOpportunityLegacy(opportunity);

    expect(setAgentSearchingMock).not.toHaveBeenCalled();
  });

  it("does not throw and does not cascade when the opportunity has no owning agent", async () => {
    const opportunity = makeOpportunity();

    await expect(writeOpportunityLegacy(opportunity)).resolves.toBe(1);

    expect(setAgentSearchingMock).not.toHaveBeenCalled();
  });
});

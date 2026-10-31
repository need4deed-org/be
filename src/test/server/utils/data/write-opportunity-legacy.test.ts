import { Lang, OpportunityStatusType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import { languageIdOf } from "../../../../server/utils/data/translate-opportunities";
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

// The translation queue has its own tests; here it only must not need a DB.
vi.mock("../../../../server/utils/data/translate-opportunities", () => ({
  languageIdOf: vi.fn(async () => 1),
  queueOpportunityTranslation: vi.fn(),
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

describe("writeOpportunityLegacy original language", () => {
  const GERMAN_INFO =
    "Wir suchen eine ehrenamtliche Person, die mit den Jungs am Nachmittag eine Tischtennisrunde in unserem Jugendraum machen kann.";
  const ENGLISH_INFO =
    "Volunteers are needed to accompany groups of children to a swimming class during the autumn break.";

  it.each([
    ["German text from an English UI", GERMAN_INFO, Lang.EN, Lang.DE],
    ["English text from a German UI", ENGLISH_INFO, Lang.DE, Lang.EN],
    ["a text too short to tell", "Tischtennis", Lang.EN, Lang.EN],
  ])("detects it for %s", async (_, info, requestLang, expected) => {
    await writeOpportunityLegacy(
      makeOpportunity({ title: "Tischtennis", info }),
      requestLang,
    );

    expect(languageIdOf).toHaveBeenCalledWith(txnManager, expected);
  });
});

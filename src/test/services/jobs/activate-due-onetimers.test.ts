import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import logger from "../../../logger";
import { createServer } from "../../../server";
import { activateDueOnetimers } from "../../../services/jobs/activate-due-onetimers";
import { DAY, failSaveOf, OnetimerFixtures } from "./onetimer-fixtures";

const scope = vi.hoisted(() => ({ agentId: 0 }));

// The job sweeps every onetimer in the shared test DB; confine it to this test's agent.
vi.mock(
  "../../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("../../../server/utils/data/build-onetimer-opportunity-query")
      >();
    return {
      buildOnetimerOpportunityQuery: (fastify: FastifyInstance) =>
        original
          .buildOnetimerOpportunityQuery(fastify)
          .andWhere("opportunity.agentId = :scopedAgentId", {
            scopedAgentId: scope.agentId,
          }),
    };
  },
);

describe("activateDueOnetimers", () => {
  let fastify: FastifyInstance;
  let fixtures: OnetimerFixtures;
  let agent: Agent;
  let loggerError: ReturnType<typeof vi.fn>;
  let loggerInfo: ReturnType<typeof vi.fn>;

  const now = () => new Date();
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    fixtures = new OnetimerFixtures(fastify);
  });

  beforeEach(async () => {
    loggerError = vi.spyOn(logger, "error") as unknown as ReturnType<
      typeof vi.fn
    >;
    loggerInfo = vi.spyOn(logger, "info") as unknown as ReturnType<
      typeof vi.fn
    >;
    agent = await fixtures.agent();
    scope.agentId = agent.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await fastify.close();
  });

  it("does nothing when no opportunity is due", async () => {
    await activateDueOnetimers(fastify);

    expect(loggerInfo).not.toHaveBeenCalled();
  });

  it("activates an opportunity due today and its matched volunteer", async () => {
    const volunteer = await fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await fixtures.onetimer(agent, {
      date: now(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
    expect(await fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(loggerInfo).toHaveBeenCalledWith(
      expect.stringContaining("processed 1 due opportunities"),
    );
  });

  it("catches up on an opportunity due on an earlier day, so a missed run is not lost", async () => {
    const volunteer = await fixtures.volunteer();
    const { opportunity } = await fixtures.onetimer(agent, {
      date: daysFromNow(-3),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
  });

  it("leaves an opportunity due on a later day alone", async () => {
    const volunteer = await fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await fixtures.onetimer(agent, {
      date: daysFromNow(2),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });

  it.each([
    OpportunityStatusType.ACTIVE,
    OpportunityStatusType.INACTIVE,
    OpportunityStatusType.PAST,
  ])("skips a due opportunity that is already %s", async (status) => {
    const volunteer = await fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await fixtures.onetimer(agent, {
      date: now(),
      status,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(status);
    expect(await fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });

  it("skips a due opportunity without a matched volunteer", async () => {
    const volunteer = await fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await fixtures.onetimer(agent, {
      date: now(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.PENDING }],
    });

    await activateDueOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("activates only the matched volunteer, leaving other candidates as they are", async () => {
    const matchedVolunteer = await fixtures.volunteer();
    const pendingVolunteer = await fixtures.volunteer();
    const {
      matches: [matched, pending],
    } = await fixtures.onetimer(agent, {
      date: now(),
      matches: [
        {
          volunteer: matchedVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
        {
          volunteer: pendingVolunteer,
          status: OpportunityVolunteerStatusType.PENDING,
        },
      ],
    });

    await activateDueOnetimers(fastify);

    expect(await fixtures.matchStatus(matched)).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(await fixtures.matchStatus(pending)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("skips a due opportunity that is not a onetimer type", async () => {
    const volunteer = await fixtures.volunteer();
    const { opportunity } = await fixtures.onetimer(agent, {
      date: now(),
      type: OpportunityType.REGULAR,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
  });

  it("marks each activated volunteer as engaged and logs the change", async () => {
    const first = await fixtures.volunteer();
    const second = await fixtures.volunteer();
    await fixtures.onetimer(agent, {
      date: now(),
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.MATCHED },
        { volunteer: second, status: OpportunityVolunteerStatusType.MATCHED },
      ],
    });

    await activateDueOnetimers(fastify);

    for (const volunteer of [first, second]) {
      expect(await fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.ACTIVE,
      );
      expect(await fixtures.engagementLogs(volunteer)).toHaveLength(1);
    }
  });

  it("keeps processing the remaining opportunities when one fails", async () => {
    const failingVolunteer = await fixtures.volunteer();
    const succeedingVolunteer = await fixtures.volunteer();
    const failing = await fixtures.onetimer(agent, {
      date: now(),
      matches: [
        {
          volunteer: failingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    const succeeding = await fixtures.onetimer(agent, {
      date: now(),
      matches: [
        {
          volunteer: succeedingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    failSaveOf(OpportunityVolunteer, failing.matches[0].id);

    await activateDueOnetimers(fastify);

    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: failing.opportunity.id }),
      expect.stringContaining(
        "failed to activate opportunity and its volunteer(s)",
      ),
    );
    expect(await fixtures.opportunityStatus(failing.opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await fixtures.matchStatus(failing.matches[0])).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(await fixtures.opportunityStatus(succeeding.opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
    expect(await fixtures.matchStatus(succeeding.matches[0])).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
  });

  it("rolls back the whole opportunity when one volunteer fails, instead of applying it partially", async () => {
    const first = await fixtures.volunteer();
    const second = await fixtures.volunteer();
    const { opportunity, matches } = await fixtures.onetimer(agent, {
      date: now(),
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.MATCHED },
        { volunteer: second, status: OpportunityVolunteerStatusType.MATCHED },
      ],
    });
    failSaveOf(OpportunityVolunteer, matches[1].id);

    await activateDueOnetimers(fastify);

    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: opportunity.id }),
      expect.stringContaining(
        "failed to activate opportunity and its volunteer(s)",
      ),
    );
    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    for (const match of matches) {
      expect(await fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.MATCHED,
      );
    }
    for (const volunteer of [first, second]) {
      expect(await fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.AVAILABLE,
      );
      expect(await fixtures.engagementLogs(volunteer)).toHaveLength(0);
    }
  });
});

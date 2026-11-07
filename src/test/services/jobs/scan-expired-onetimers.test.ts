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
import { scanExpiredOnetimers } from "../../../services/jobs/scan-expired-onetimers";
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

describe("scanExpiredOnetimers", () => {
  let fastify: FastifyInstance;
  let fixtures: OnetimerFixtures;
  let agent: Agent;
  let loggerError: ReturnType<typeof vi.fn>;
  let loggerInfo: ReturnType<typeof vi.fn>;

  const expired = () => new Date(Date.now() - 10 * DAY);

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

  it("does nothing when no opportunity has expired", async () => {
    await scanExpiredOnetimers(fastify);

    expect(loggerInfo).not.toHaveBeenCalled();
  });

  it.each([
    OpportunityVolunteerStatusType.MATCHED,
    OpportunityVolunteerStatusType.ACTIVE,
  ])(
    "marks an expired opportunity with a %s volunteer PAST, and that volunteer PAST",
    async (status) => {
      const volunteer = await fixtures.volunteer();
      const {
        opportunity,
        matches: [match],
      } = await fixtures.onetimer(agent, {
        date: expired(),
        status: OpportunityStatusType.ACTIVE,
        matches: [{ volunteer, status }],
      });

      await scanExpiredOnetimers(fastify);

      expect(await fixtures.opportunityStatus(opportunity)).toBe(
        OpportunityStatusType.PAST,
      );
      expect(await fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.PAST,
      );
      expect(loggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("processed 1 expired opportunities"),
      );
    },
  );

  it("leaves other candidates of a PAST opportunity as they are", async () => {
    const matchedVolunteer = await fixtures.volunteer();
    const pendingVolunteer = await fixtures.volunteer();
    const {
      matches: [matched, pending],
    } = await fixtures.onetimer(agent, {
      date: expired(),
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

    await scanExpiredOnetimers(fastify);

    expect(await fixtures.matchStatus(matched)).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
    expect(await fixtures.matchStatus(pending)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("marks an expired opportunity without a matched or active volunteer INACTIVE", async () => {
    const volunteer = await fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await fixtures.onetimer(agent, {
      date: expired(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.PENDING }],
    });

    await scanExpiredOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.INACTIVE,
    );
    expect(await fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("leaves an opportunity that has not expired yet alone", async () => {
    const volunteer = await fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await fixtures.onetimer(agent, {
      date: new Date(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await scanExpiredOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });

  it.each([OpportunityStatusType.INACTIVE, OpportunityStatusType.PAST])(
    "skips an expired opportunity that is already %s",
    async (status) => {
      const volunteer = await fixtures.volunteer();
      const {
        opportunity,
        matches: [match],
      } = await fixtures.onetimer(agent, {
        date: expired(),
        status,
        matches: [
          { volunteer, status: OpportunityVolunteerStatusType.MATCHED },
        ],
      });

      await scanExpiredOnetimers(fastify);

      expect(await fixtures.opportunityStatus(opportunity)).toBe(status);
      expect(await fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.MATCHED,
      );
    },
  );

  it("skips an expired opportunity that is not a onetimer type", async () => {
    const { opportunity } = await fixtures.onetimer(agent, {
      date: expired(),
      type: OpportunityType.REGULAR,
    });

    await scanExpiredOnetimers(fastify);

    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
  });

  it("releases each finished volunteer back to available and logs the change", async () => {
    const first = await fixtures.volunteer(VolunteerStateEngagementType.ACTIVE);
    const second = await fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    await fixtures.onetimer(agent, {
      date: expired(),
      status: OpportunityStatusType.ACTIVE,
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.ACTIVE },
        { volunteer: second, status: OpportunityVolunteerStatusType.ACTIVE },
      ],
    });

    await scanExpiredOnetimers(fastify);

    for (const volunteer of [first, second]) {
      expect(await fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.AVAILABLE,
      );
      expect(await fixtures.engagementLogs(volunteer)).toHaveLength(1);
    }
  });

  it("keeps a volunteer engaged who is still active on another opportunity", async () => {
    const volunteer = await fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    await fixtures.onetimer(agent, {
      date: expired(),
      status: OpportunityStatusType.ACTIVE,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.ACTIVE }],
    });
    await fixtures.onetimer(agent, {
      date: new Date(),
      status: OpportunityStatusType.ACTIVE,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.ACTIVE }],
    });

    await scanExpiredOnetimers(fastify);

    expect(await fixtures.engagement(volunteer)).toBe(
      VolunteerStateEngagementType.ACTIVE,
    );
    expect(await fixtures.engagementLogs(volunteer)).toHaveLength(0);
  });

  it("keeps processing the remaining opportunities when one fails", async () => {
    const failingVolunteer = await fixtures.volunteer();
    const succeedingVolunteer = await fixtures.volunteer();
    const failing = await fixtures.onetimer(agent, {
      date: expired(),
      matches: [
        {
          volunteer: failingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    const succeeding = await fixtures.onetimer(agent, {
      date: expired(),
      matches: [
        {
          volunteer: succeedingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    failSaveOf(OpportunityVolunteer, failing.matches[0].id);

    await scanExpiredOnetimers(fastify);

    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: failing.opportunity.id }),
      expect.stringContaining(
        "failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
      ),
    );
    expect(await fixtures.opportunityStatus(failing.opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await fixtures.matchStatus(failing.matches[0])).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(await fixtures.opportunityStatus(succeeding.opportunity)).toBe(
      OpportunityStatusType.PAST,
    );
    expect(await fixtures.matchStatus(succeeding.matches[0])).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
  });

  it("rolls back the whole opportunity when one volunteer fails, instead of applying it partially", async () => {
    const first = await fixtures.volunteer(VolunteerStateEngagementType.ACTIVE);
    const second = await fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    const { opportunity, matches } = await fixtures.onetimer(agent, {
      date: expired(),
      status: OpportunityStatusType.ACTIVE,
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.ACTIVE },
        { volunteer: second, status: OpportunityVolunteerStatusType.ACTIVE },
      ],
    });
    failSaveOf(OpportunityVolunteer, matches[1].id);

    await scanExpiredOnetimers(fastify);

    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: opportunity.id,
        opportunityVolunteerIds: matches.map(({ id }) => id),
      }),
      expect.stringContaining(
        "failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
      ),
    );
    expect(await fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
    for (const match of matches) {
      expect(await fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.ACTIVE,
      );
    }
    for (const volunteer of [first, second]) {
      expect(await fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.ACTIVE,
      );
      expect(await fixtures.engagementLogs(volunteer)).toHaveLength(0);
    }
  });
});

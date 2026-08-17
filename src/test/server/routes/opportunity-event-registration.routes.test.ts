import { FastifyInstance } from "fastify";
import { OpportunityType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import OpportunityEventRegistration from "../../../data/entity/opportunity-event-registration.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getRepository } from "../../../data/utils";
import { createServer } from "../../../server";

describe("POST /event-registration", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const opportunityIds: number[] = [];
  const onetimerIds: number[] = [];

  let futureEventOpportunityId: number;
  let pastEventOpportunityId: number;
  let accompanyingOpportunityId: number;
  let noOnetimerOpportunityId: number;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const onetimerRepository = getRepository(dataSource, Onetimer);

    async function makeOpportunity(
      type: OpportunityType,
      date: Date | null,
    ): Promise<number> {
      let onetimerId: number | undefined;
      if (date) {
        const onetimer = await onetimerRepository.save(new Onetimer({ date }));
        onetimerIds.push(onetimer.id);
        onetimerId = onetimer.id;
      }
      const opportunity = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Test event-registration opportunity ${suffix}`,
          type,
          onetimerId,
        } as Partial<Opportunity>),
      );
      opportunityIds.push(opportunity.id);
      return opportunity.id;
    }

    futureEventOpportunityId = await makeOpportunity(
      OpportunityType.EVENTS,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );
    pastEventOpportunityId = await makeOpportunity(
      OpportunityType.EVENTS,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    accompanyingOpportunityId = await makeOpportunity(
      OpportunityType.ACCOMPANYING,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );
    noOnetimerOpportunityId = await makeOpportunity(
      OpportunityType.REGULAR,
      null,
    );
  });

  afterAll(async () => {
    await getRepository(dataSource, OpportunityEventRegistration).delete({
      opportunityId: futureEventOpportunityId,
    });
    for (const id of opportunityIds) {
      await fastify.db.opportunityRepository.delete({ id });
    }
    for (const id of onetimerIds) {
      await fastify.db.onetimerRepository.delete({ id });
    }
    await fastify.close();
  });

  it("registers an attendee for a future, dated, non-accompanying opportunity", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event-registration/",
      payload: {
        opportunityId: futureEventOpportunityId,
        fullName: "Ali K.",
        email: "ali@example.com",
        phone: "+49123456",
        numberOfPeople: 2,
        languagePreference: "Arabic",
        message: "Looking forward to it",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ message: "Registration submitted." });

    const saved = await getRepository(
      dataSource,
      OpportunityEventRegistration,
    ).findOneOrFail({ where: { opportunityId: futureEventOpportunityId } });
    expect(saved.fullName).toBe("Ali K.");
    expect(saved.email).toBe("ali@example.com");
    expect(saved.numberOfPeople).toBe(2);
  });

  it("returns 404 when the opportunity does not exist", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event-registration/",
      payload: {
        opportunityId: -1,
        fullName: "Ali K.",
        email: "ali@example.com",
        numberOfPeople: 1,
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for an accompanying-type opportunity", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event-registration/",
      payload: {
        opportunityId: accompanyingOpportunityId,
        fullName: "Ali K.",
        email: "ali@example.com",
        numberOfPeople: 1,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for an opportunity with no date", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event-registration/",
      payload: {
        opportunityId: noOnetimerOpportunityId,
        fullName: "Ali K.",
        email: "ali@example.com",
        numberOfPeople: 1,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when the event date has already passed", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event-registration/",
      payload: {
        opportunityId: pastEventOpportunityId,
        fullName: "Ali K.",
        email: "ali@example.com",
        numberOfPeople: 1,
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

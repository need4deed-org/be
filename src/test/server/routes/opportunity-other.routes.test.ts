import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  Lang,
  OpportunityStatusType,
  OpportunityType,
  TranslationOrigin,
  TranslationStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { languageIdOf } from "../../../server/utils/data/translate-opportunities";
import { sourceHashOf } from "../../../services/translation/queue";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Caller = "member" | "pendingMember" | "volunteer";
type OpportunityKey =
  | "own"
  | "otherOpen"
  | "otherPast"
  | "otherAccompanying"
  | "orphan";

const TRANSLATED_TITLE = "Homework help";
const HIDDEN_INFO = "hidden-info-text";

describe("GET /opportunity/other (fe#1052)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `OtherOpp ${suffix}`;

  let ownAgent: Agent;
  let otherAgent: Agent;
  let districtId: number;
  const deals: Deal[] = [];
  const opportunities = {} as Record<OpportunityKey, Opportunity>;
  const persons: Person[] = [];
  const cookies = {} as Record<Caller, string>;

  const get = (url: string, as: Caller) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookies[as] },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const [district]: { id: number }[] =
      await fastify.db.agentRepository.manager.query(
        `SELECT id FROM district ORDER BY id LIMIT 1`,
      );
    districtId = district.id;
    [ownAgent, otherAgent] = await Promise.all(
      ["own", "other"].map((key) =>
        fastify.db.agentRepository.save(
          new Agent({
            title: `${prefix} agent ${key}`,
            engagementStatus: AgentEngagementStatusType.ACTIVE,
            districtId,
          }),
        ),
      ),
    );

    const setup: Record<
      OpportunityKey,
      {
        agent: Agent | null;
        status: OpportunityStatusType;
        type?: OpportunityType;
      }
    > = {
      own: { agent: ownAgent, status: OpportunityStatusType.NEW },
      otherOpen: { agent: otherAgent, status: OpportunityStatusType.SEARCHING },
      otherPast: { agent: otherAgent, status: OpportunityStatusType.PAST },
      otherAccompanying: {
        agent: otherAgent,
        status: OpportunityStatusType.SEARCHING,
        type: OpportunityType.ACCOMPANYING,
      },
      orphan: { agent: null, status: OpportunityStatusType.SEARCHING },
    };
    for (const [key, { agent, status, type }] of Object.entries(setup) as [
      OpportunityKey,
      {
        agent: Agent | null;
        status: OpportunityStatusType;
        type?: OpportunityType;
      },
    ][]) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `${prefix} ${key}`,
          type: type ?? OpportunityType.REGULAR,
          status,
          dealId: deal.id,
          agentId: agent?.id,
          info: HIDDEN_INFO,
        }),
      );
    }
    await dataSource.getRepository(FieldTranslation).save({
      opportunityId: opportunities.otherOpen.id,
      fieldName: "title",
      languageId: await languageIdOf(dataSource.manager, Lang.EN),
      translation: TRANSLATED_TITLE,
      origin: TranslationOrigin.MACHINE,
      status: TranslationStatus.DONE,
      sourceHash: sourceHashOf(opportunities.otherOpen.title),
    });

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      member: UserRole.AGENT,
      pendingMember: UserRole.AGENT,
      volunteer: UserRole.VOLUNTEER,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Other", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const email = `other-opp-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      if (caller !== "volunteer") {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: ownAgent.id,
            personId: person.id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status:
              caller === "member"
                ? AgentMembershipStatus.ACTIVE
                : AgentMembershipStatus.PENDING,
          }),
        );
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    for (const opportunity of Object.values(opportunities)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    await fastify.db.agentPersonRepository.delete({ agentId: ownAgent.id });
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    for (const agent of [ownAgent, otherAgent]) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify.close();
  });

  it("lists other NGOs' open opportunities, title and location only", async () => {
    const res = await get(
      `/opportunity/other?search=${encodeURIComponent(prefix)}`,
      "member",
    );
    expect(res.statusCode).toBe(200);
    const { data, count } = res.json();
    expect(count).toBe(1);
    expect(data).toHaveLength(1);
    expect(Object.keys(data[0]).sort()).toEqual(
      ["createdAt", "district", "id", "title"].sort(),
    );
    expect(data[0].id).toBe(opportunities.otherOpen.id);
  });

  it("falls back to the NGO's district, titled in German only", async () => {
    const res = await get(
      `/opportunity/other?search=${encodeURIComponent(prefix)}`,
      "member",
    );
    const [row] = res.json().data;
    expect(row.district.id).toBe(districtId);
    expect(Object.keys(row.district.title)).toEqual(["de"]);
  });

  it("is empty for an NGO user without an active membership", async () => {
    const res = await get(
      `/opportunity/other?search=${encodeURIComponent(prefix)}`,
      "pendingMember",
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], count: 0 });
  });

  it("finds titles by their displayed translation", async () => {
    const res = await get(
      `/opportunity/other?language=en&search=${encodeURIComponent(TRANSLATED_TITLE)}`,
      "member",
    );
    const ids = res.json().data.map((row: { id: number }) => row.id);
    expect(ids).toContain(opportunities.otherOpen.id);
    const row = res
      .json()
      .data.find((r: { id: number }) => r.id === opportunities.otherOpen.id);
    expect(row.title).toBe(TRANSLATED_TITLE);
  });

  it("never matches text the rows don't show", async () => {
    const res = await get(
      `/opportunity/other?search=${encodeURIComponent(HIDDEN_INFO)}`,
      "member",
    );
    expect(res.json().count).toBe(0);
  });

  it("treats LIKE wildcards in the search literally", async () => {
    const res = await get(
      `/opportunity/other?search=${encodeURIComponent(`${prefix}%`)}`,
      "member",
    );
    expect(res.json().count).toBe(0);
  });

  it("is only for NGO users", async () => {
    expect((await get("/opportunity/other", "volunteer")).statusCode).toBe(403);
  });

  it("still 404s another NGO's opportunity detail", async () => {
    const res = await get(
      `/opportunity/${opportunities.otherOpen.id}`,
      "member",
    );
    expect(res.statusCode).toBe(404);
  });
});

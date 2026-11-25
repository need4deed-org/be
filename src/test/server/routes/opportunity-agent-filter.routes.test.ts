import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

type AgentKey = "ownA" | "ownB" | "foreign";
type Caller = "ngo" | "coordinator";

describe("GET /opportunity?filter[agent]=", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const agents = {} as Record<AgentKey, Agent>;
  const opportunities = {} as Record<AgentKey, Opportunity>;
  const deals: Deal[] = [];
  const persons: Person[] = [];
  const cookies = {} as Record<Caller, string>;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await firstSeeded(fastify.db.postcodeRepository);

    for (const key of ["ownA", "ownB", "foreign"] as AgentKey[]) {
      agents[key] = await fastify.db.agentRepository.save(
        new Agent({ title: `Agent filter ${key} ${suffix}` }),
      );
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Agent filter opportunity ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.SEARCHING,
          agentId: agents[key].id,
          dealId: deal.id,
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      ngo: UserRole.AGENT,
      coordinator: UserRole.COORDINATOR,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Agent", lastName: `Filter ${caller}` }),
      );
      persons.push(person);
      const email = `agent-filter-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      if (caller === "ngo") {
        for (const key of ["ownA", "ownB"] as AgentKey[]) {
          await fastify.db.agentPersonRepository.save(
            new AgentPerson({ agentId: agents[key].id, personId: person.id }),
          );
        }
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      const cookie = res.cookies.find((c) => c.name === accessCookieName);
      if (!cookie) {
        throw new Error(`login failed for ${caller}`);
      }
      cookies[caller] = cookie.value;
    }
  });

  afterAll(async () => {
    const personIds = persons.map((p) => p.id);
    const agentIds = Object.values(agents).map((a) => a.id);
    for (const personId of personIds) {
      await fastify.db.agentPersonRepository.delete({ personId });
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    for (const opportunity of Object.values(opportunities)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const id of agentIds) {
      await fastify.db.agentRepository.delete({ id });
    }
    await fastify.close();
  });

  const list = async (as: Caller, query: string) => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?limit=100&${query}`,
      cookies: { [accessCookieName]: cookies[as] },
    });
    return res;
  };

  const listIds = async (as: Caller, keys: AgentKey[]) => {
    const query = keys
      .map((key) => `filter[agent]=${agents[key].id}`)
      .join("&");
    const res = await list(as, query);
    expect(res.statusCode).toBe(200);
    return (res.json().data as { id: number }[]).map((o) => o.id).sort();
  };

  const idsOf = (keys: AgentKey[]) =>
    keys.map((key) => opportunities[key].id).sort();

  it("narrows an NGO user's list to one of their NGOs", async () => {
    expect(await listIds("ngo", ["ownA"])).toEqual(idsOf(["ownA"]));
  });

  it("narrows an NGO user's list to several of their NGOs", async () => {
    expect(await listIds("ngo", ["ownA", "ownB"])).toEqual(
      idsOf(["ownA", "ownB"]),
    );
  });

  it("returns nothing for an NGO user filtering by a foreign NGO", async () => {
    const res = await list("ngo", `filter[agent]=${agents.foreign.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], count: 0 });
  });

  it("drops foreign ids from an NGO user's filter", async () => {
    expect(await listIds("ngo", ["ownA", "foreign"])).toEqual(idsOf(["ownA"]));
  });

  it("returns nothing for an NGO user filtering filter[agentId] by a foreign NGO", async () => {
    const res = await list("ngo", `filter[agentId]=${agents.foreign.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], count: 0 });
  });

  it("lets staff filter by any NGO ids", async () => {
    expect(await listIds("coordinator", ["foreign"])).toEqual(
      idsOf(["foreign"]),
    );
    expect(await listIds("coordinator", ["ownA", "foreign"])).toEqual(
      idsOf(["ownA", "foreign"]),
    );
  });

  it.each(["abc", "0", "9999999999"])(
    "rejects filter[agent]=%s",
    async (value) => {
      const res = await list("coordinator", `filter[agent]=${value}`);
      expect(res.statusCode).toBe(400);
    },
  );
});

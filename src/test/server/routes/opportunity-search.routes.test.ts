import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  EntityTableName,
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Skill from "../../../data/entity/profile/skill.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("GET /opportunity search across profile fields", () => {
  let fastify: FastifyInstance;
  let cookie: string;
  let agent: Agent;
  let deal: Deal;
  let skill: Skill;
  let opportunity: Opportunity;
  let person: Person;
  const suffix = randomNumericSuffix();
  const agentTitle = `Heimfeld-${suffix}`;
  const skillTitle = `Pottery-${suffix}`;
  const commentToken = `Schlüsselübergabe-${suffix}`;

  const search = async (q: string) => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(q)}`,
      cookies: { [accessCookieName]: cookie },
    });
    expect(res.statusCode).toBe(200);
    return (res.json().data as { id: number }[]).map(({ id }) => id);
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: agentTitle,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Search opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );
    skill = await getRepository(dataSource, Skill).save(
      new Skill({ title: skillTitle }),
    );
    await getRepository(dataSource, DealSkill).save(
      new DealSkill({ dealId: deal.id, skillId: skill.id }),
    );

    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Search", lastName: "Coordinator" }),
    );
    const email = `coordinator-opp-search-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    const accessCookie = res.cookies.find((c) => c.name === accessCookieName);
    if (!accessCookie) {
      throw new Error("login failed");
    }
    cookie = accessCookie.value;

    const author = await fastify.db.userRepository.findOneByOrFail({ email });
    const language = await fastify.db.languageRepository.findOneByOrFail({
      isoCode: "en",
    });
    await getRepository(dataSource, Comment).save(
      new Comment({
        text: `${commentToken} on Friday`,
        entityType: EntityTableName.OPPORTUNITY,
        entityId: opportunity.id,
        userId: author.id,
        languageId: language.id,
      }),
    );
  });

  afterAll(async () => {
    if (!deal) {
      return;
    }
    await getRepository(dataSource, DealSkill).delete({ dealId: deal.id });
    await getRepository(dataSource, Skill).delete({ id: skill.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.close();
  });

  it("finds an opportunity by its NGO's name", async () => {
    expect(await search(agentTitle.toLowerCase())).toEqual([opportunity.id]);
  });

  it("finds an opportunity by one of its skills", async () => {
    expect(await search(skillTitle)).toEqual([opportunity.id]);
  });

  it("finds an opportunity by a word in a coordinator comment", async () => {
    expect(await search(commentToken)).toEqual([opportunity.id]);
  });

  it("still finds an opportunity by its title", async () => {
    expect(await search(`Search opportunity ${suffix}`)).toEqual([
      opportunity.id,
    ]);
  });
});

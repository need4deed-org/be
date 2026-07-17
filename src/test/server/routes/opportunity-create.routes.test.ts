import { FastifyInstance } from "fastify";
import { OpportunityLegacyType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Activity from "../../../data/entity/profile/activity.entity";
import Language from "../../../data/entity/profile/language.entity";
import Skill from "../../../data/entity/profile/skill.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

const PASSWORD = "test_password";

function getCookie(
  cookies: { name: string; value: string }[],
  name: string,
): string {
  const cookie = cookies.find((c) => c.name === name)?.value;
  if (!cookie) {
    throw new Error(`Cookie ${name} not found in response`);
  }
  return cookie;
}

// Regression test for be#774: POST /opportunity (dashboard create) resolves
// activities/skills/languages by numeric option id, unlike POST
// /opportunity/legacy which resolves free-text/ISO-code strings by title.
describe("POST /opportunity resolves activities/skills/languages by id", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let agent: Agent;
  let addressId: number;
  let activity: Activity;
  let skill: Skill;
  let language: Language;
  let createdOpportunityId: number;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const addressRepository = getRepository(dataSource, Address);
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const address = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );
    addressId = address.id;

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent ${suffix}`, addressId: address.id }),
    );

    const pwHash = await hashPassword(PASSWORD);
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );

    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);

    activity = await getRepository(dataSource, Activity).save(
      new Activity({ title: `Test Activity ${suffix}` }),
    );
    skill = await getRepository(dataSource, Skill).save(
      new Skill({ title: `Test Skill ${suffix}` }),
    );
    language = await getRepository(dataSource, Language).save(
      new Language({ isoCode: "xx", title: `Test Language ${suffix}` }),
    );
  });

  afterAll(async () => {
    if (createdOpportunityId) {
      await fastify.db.opportunityRepository.delete({
        id: createdOpportunityId,
      });
    }
    await getRepository(dataSource, Activity).delete({ id: activity.id });
    await getRepository(dataSource, Skill).delete({ id: skill.id });
    await getRepository(dataSource, Language).delete({ id: language.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: addressId });
    await fastify.close();
  });

  it("saves the deal's activities/skills/languages given numeric option ids", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity/",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        title: `Test Opportunity ${suffix}`,
        opportunity_type: OpportunityLegacyType.VOLUNTEERING,
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        agent_id: agent.id,
        activityIds: [activity.id],
        skillIds: [skill.id],
        languageIds: [language.id],
      },
    });

    expect(res.statusCode).toBe(201);
    createdOpportunityId = res.json().data.id;

    const opportunityRepository = getRepository(dataSource, Opportunity);
    const saved = await opportunityRepository.findOneOrFail({
      where: { id: createdOpportunityId },
      relations: [
        "deal.dealActivity.activity",
        "deal.dealSkill.skill",
        "deal.dealLanguage.language",
      ],
    });

    expect(saved.deal.dealActivity.map((da) => da.activity.id)).toEqual([
      activity.id,
    ]);
    expect(saved.deal.dealSkill.map((ds) => ds.skill.id)).toEqual([skill.id]);
    expect(saved.deal.dealLanguage.map((dl) => dl.language.id)).toEqual([
      language.id,
    ]);
  });
});

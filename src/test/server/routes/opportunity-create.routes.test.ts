import { FastifyInstance } from "fastify";
import { AgentRoleType, OpportunityLegacyType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
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

// Regression test for be#844: Opportunity.onetimer had no explicit save in
// writeOpportunityLegacy (unlike Opportunity.accompanying), so a freshly
// built (no-id) Onetimer was silently dropped and onetimerId stayed null on
// creation, for both ACCOMPANYING and EVENTS-type opportunities.
describe("POST /opportunity persists onetimer on creation (be#844)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let agent: Agent;
  let addressId: number;
  let postcodeValue: string;
  const createdOpportunityIds: number[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const addressRepository = getRepository(dataSource, Address);
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    postcodeValue = postcode.value;
    const address = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );
    addressId = address.id;

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent (onetimer-create) ${suffix}`,
        addressId: address.id,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-onetimer-create-${suffix}@test.need4deed.org`,
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
        email: `coordinator-onetimer-create-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);
  });

  afterAll(async () => {
    for (const id of createdOpportunityIds) {
      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id },
      });
      // Deletion order matters: opportunity first (it holds the FKs), then
      // its deal/accompanying/onetimer — deal_timeslot cascades with the
      // deal, so no separate cleanup is needed for it.
      await fastify.db.opportunityRepository.delete({ id });
      if (opportunity?.dealId) {
        await getRepository(dataSource, Deal).delete({
          id: opportunity.dealId,
        });
      }
      if (opportunity?.accompanyingId) {
        await getRepository(dataSource, Accompanying).delete({
          id: opportunity.accompanyingId,
        });
      }
      if (opportunity?.onetimerId) {
        await fastify.db.onetimerRepository.delete({
          id: opportunity.onetimerId,
        });
      }
    }
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: addressId });
    await fastify.close();
  });

  it("creates and links a onetimer for an ACCOMPANYING-type opportunity", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity/",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        title: `Test Onetimer Accompanying ${suffix}`,
        opportunity_type: OpportunityLegacyType.ACCOMPANYING,
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        agent_id: agent.id,
        accomp_address: "Teststraße 1",
        accomp_postcode: postcodeValue,
        accomp_datetime: "2026-08-28T13:55:00",
        accomp_name: "John Doe",
        accomp_phone: "420-024",
        accomp_translation: "deutsche",
      },
    });

    expect(res.statusCode).toBe(201);
    const createdId = res.json().data.id;
    createdOpportunityIds.push(createdId);

    const saved = await fastify.db.opportunityRepository.findOneOrFail({
      where: { id: createdId },
    });
    expect(saved.onetimerId).toBeTruthy();

    const onetimer = await getRepository(dataSource, Onetimer).findOneByOrFail({
      id: saved.onetimerId,
    });
    expect(new Date(onetimer.date).toISOString().slice(0, 10)).toBe(
      "2026-08-28",
    );
  });

  it("creates and links a onetimer for an EVENTS-type opportunity", async () => {
    // Unique per test run (not a fixed literal): buildDealTimeslots() also
    // finds-or-creates a Timeslot row for this date, which we don't clean up
    // below (matching existing convention elsewhere in this suite) — a fixed
    // literal would keep matching the same row and mask the leftover Deal/
    // DealTimeslot rows this regression guards against (be#844 review).
    const eventDateTime = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);

    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity/",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        title: `Test Onetimer Events ${suffix}`,
        opportunity_type: OpportunityLegacyType.VOLUNTEERING,
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        agent_id: agent.id,
        onetime_date_time: eventDateTime.toISOString(),
      },
    });

    expect(res.statusCode).toBe(201);
    const createdId = res.json().data.id;
    createdOpportunityIds.push(createdId);

    const saved = await fastify.db.opportunityRepository.findOneOrFail({
      where: { id: createdId },
    });
    expect(saved.onetimerId).toBeTruthy();

    const onetimer = await getRepository(dataSource, Onetimer).findOneByOrFail({
      id: saved.onetimerId,
    });
    expect(new Date(onetimer.date).toISOString().slice(0, 10)).toBe(
      eventDateTime.toISOString().slice(0, 10),
    );
  });
});

// Regression test for be#833: adding a new contact to an agent must not
// retroactively change which contact an already-existing opportunity shows.
// POST /opportunity now snapshots contact_person_id at creation time instead
// of leaving it null (which used to make getOpportunityContact re-derive it,
// live, from the agent's *current* representative on every read).
describe("POST /opportunity freezes contact_person_id at creation (be#833)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let agent: Agent;
  let addressId: number;
  let existingContact: Person;
  const createdOpportunityIds: number[] = [];

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
      new Agent({ title: `Test Agent (contact-freeze) ${suffix}`, addressId }),
    );

    existingContact = await fastify.db.personRepository.save(
      new Person({
        firstName: "Alice",
        lastName: "Existing",
        email: `alice-contact-freeze-${suffix}@test.need4deed.org`,
      }),
    );
    await getRepository(dataSource, AgentPerson).save(
      new AgentPerson({
        agentId: agent.id,
        personId: existingContact.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-contact-freeze-${suffix}@test.need4deed.org`,
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
        email: `coordinator-contact-freeze-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);
  });

  afterAll(async () => {
    for (const id of createdOpportunityIds) {
      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id },
      });
      await fastify.db.opportunityRepository.delete({ id });
      if (opportunity?.dealId) {
        await getRepository(dataSource, Deal).delete({
          id: opportunity.dealId,
        });
      }
    }
    await getRepository(dataSource, AgentPerson).delete({ agentId: agent.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: existingContact.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: addressId });
    await fastify.close();
  });

  it("sets contact_person_id to the agent's representative at creation, and it stays put after a new contact is added", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity/",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        title: `Test Opportunity (contact-freeze) ${suffix}`,
        opportunity_type: OpportunityLegacyType.VOLUNTEERING,
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        agent_id: agent.id,
      },
    });

    expect(res.statusCode).toBe(201);
    const createdId = res.json().data.id;
    createdOpportunityIds.push(createdId);

    const opportunityRepository = getRepository(dataSource, Opportunity);
    const savedBefore = await opportunityRepository.findOneOrFail({
      where: { id: createdId },
    });
    // The coordinator who created this isn't an agent member, so contact
    // resolves to the agent's sole (volunteer-coordinator) contact.
    expect(savedBefore.contactPersonId).toBe(existingContact.id);

    // Now add a brand new contact to the agent, with the same role — this is
    // exactly the action the bug report describes as retroactively hijacking
    // the contact shown on already-existing requests.
    const newContact = await fastify.db.personRepository.save(
      new Person({ firstName: "Bob", lastName: "NewContact" }),
    );
    await getRepository(dataSource, AgentPerson).save(
      new AgentPerson({
        agentId: agent.id,
        personId: newContact.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );

    const savedAfter = await opportunityRepository.findOneOrFail({
      where: { id: createdId },
    });
    expect(savedAfter.contactPersonId).toBe(existingContact.id);

    await getRepository(dataSource, AgentPerson).delete({
      agentId: agent.id,
      personId: newContact.id,
    });
    await fastify.db.personRepository.delete({ id: newContact.id });
  });
});

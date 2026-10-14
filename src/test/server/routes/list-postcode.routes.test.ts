import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("postcode on NGO and opportunity lists", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const title = `List Postcode ${suffix}`;

  let agentPostcode: Postcode;
  let opportunityPostcode: Postcode;
  let address: Address;
  let agent: Agent;
  let opportunityDeal: Deal;
  let opportunity: Opportunity;
  const volunteerDealIds: number[] = [];
  const volunteerIds: number[] = [];
  const personIds: number[] = [];
  const cookies: Record<"member" | "matched" | "browsing", string> = {
    member: "",
    matched: "",
    browsing: "",
  };

  async function makeUser(role: UserRole, label: string): Promise<Person> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "List", lastName: label }),
    );
    personIds.push(person.id);
    const email = `${label}-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookies[label as keyof typeof cookies] = res.cookies.find(
      (c) => c.name === accessCookieName,
    )!.value;
    return person;
  }

  async function makeVolunteer(person: Person): Promise<Volunteer> {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: agentPostcode.id }),
    );
    volunteerDealIds.push(deal.id);
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: person.id }),
    );
    volunteerIds.push(volunteer.id);
    return volunteer;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    [agentPostcode, opportunityPostcode] = await dataSource
      .getRepository(Postcode)
      .save([
        new Postcode({ value: `3${suffix}` }),
        new Postcode({ value: `4${suffix}` }),
      ]);
    address = await dataSource
      .getRepository(Address)
      .save(new Address({ postcodeId: agentPostcode.id }));
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title,
        addressId: address.id,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({
        type: DealType.OPPORTUNITY,
        postcodeId: opportunityPostcode.id,
      }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.SEARCHING,
        agentId: agent.id,
        dealId: opportunityDeal.id,
      }),
    );

    const member = await makeUser(UserRole.AGENT, "member");
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: member.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const matched = await makeVolunteer(
      await makeUser(UserRole.VOLUNTEER, "matched"),
    );
    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: matched.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );
    await makeVolunteer(await makeUser(UserRole.VOLUNTEER, "browsing"));
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      opportunityId: opportunity.id,
    });
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    if (volunteerIds.length) {
      await fastify.db.volunteerRepository.delete(volunteerIds);
      await fastify.db.dealRepository.delete(volunteerDealIds);
    }
    for (const personId of personIds) {
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await dataSource.getRepository(Address).delete({ id: address.id });
    await dataSource
      .getRepository(Postcode)
      .delete([agentPostcode.id, opportunityPostcode.id]);
    await fastify.close();
  });

  async function listed(url: string, cookie: string, id: number) {
    const res = await fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });
    expect(res.statusCode).toBe(200);
    return res.json().data.find((item: { id: number }) => item.id === id) as
      | { postcode: string | null }
      | undefined;
  }

  const search = `filter[search]=${encodeURIComponent(title)}`;

  it("shows an NGO member their own NGO's postcode on GET /agent", async () => {
    expect(
      await listed(`/agent?${search}`, cookies.member, agent.id),
    ).toMatchObject({ postcode: agentPostcode.value });
  });

  it("shows a matched volunteer the opportunity's postcode on GET /opportunity", async () => {
    expect(
      await listed(`/opportunity?${search}`, cookies.matched, opportunity.id),
    ).toMatchObject({ postcode: opportunityPostcode.value });
  });

  it("hides the opportunity's postcode from a volunteer who isn't matched", async () => {
    expect(
      await listed(`/opportunity?${search}`, cookies.browsing, opportunity.id),
    ).toMatchObject({ postcode: null });
  });
});

import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityStatusType,
  OpportunityType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
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

describe("ops alert on profile edits by volunteers and agents (be#971)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const coordinatorEmail = `coordinator-edit-alert-${suffix}@test.need4deed.org`;
  const volunteerEmail = `volunteer-edit-alert-${suffix}@test.need4deed.org`;
  const agentEmail = `agent-edit-alert-${suffix}@test.need4deed.org`;
  const agentTitle = `EditAlert agent ${suffix}`;
  const opportunityTitle = `EditAlert opportunity ${suffix}`;

  const deals: Deal[] = [];
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let agentPerson: Person;
  let agent: Agent;
  let opportunity: Opportunity;
  let coordinatorCookie: string;
  let volunteerCookie: string;
  let agentCookie: string;
  let opsAlert: ReturnType<typeof vi.spyOn>;

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return res.cookies.find((cookie) => cookie.name === accessCookieName)!
      .value;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const { id: postcodeId } =
      await fastify.db.postcodeRepository.findOneOrFail({ where: {} });
    const password = await hashPassword(PASSWORD);

    const volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId }),
    );
    deals.push(volunteerDeal);
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "EditAlert", lastName: `Volunteer-${suffix}` }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: volunteerDeal.id, personId: volunteerPerson.id }),
    );

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: agentTitle,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    const opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );
    deals.push(opportunityDeal);
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: opportunityTitle,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: opportunityDeal.id,
      }),
    );

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "EditAlert", lastName: `Agent-${suffix}` }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: agentPerson.id,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    await fastify.db.userRepository.save([
      new User({
        email: coordinatorEmail,
        password,
        role: UserRole.COORDINATOR,
        isActive: true,
      }),
      new User({
        email: volunteerEmail,
        password,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
      new User({
        email: agentEmail,
        password,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    ]);

    coordinatorCookie = await login(coordinatorEmail);
    volunteerCookie = await login(volunteerEmail);
    agentCookie = await login(agentEmail);

    opsAlert = vi.spyOn(fastify.notify, "opsAlert").mockResolvedValue();
  });

  afterEach(() => {
    opsAlert.mockClear();
  });

  afterAll(async () => {
    opsAlert?.mockRestore();
    await fastify.db.userRepository.delete({ email: coordinatorEmail });
    await fastify.db.userRepository.delete({ email: volunteerEmail });
    await fastify.db.userRepository.delete({ email: agentEmail });
    if (opportunity) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    if (volunteer) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    if (agentPerson) {
      await fastify.db.agentPersonRepository.delete({
        personId: agentPerson.id,
      });
      await fastify.db.personRepository.delete({ id: agentPerson.id });
    }
    if (volunteerPerson) {
      await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    }
    if (agent) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify?.close();
  });

  it("alerts when a volunteer edits their own profile", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/volunteer/${volunteer.id}?language=en`,
      cookies: { [accessCookieName]: volunteerCookie },
      payload: { infoAbout: "Updated by the volunteer" },
    });
    expect(res.statusCode).toBe(200);

    expect(opsAlert).toHaveBeenCalledTimes(1);
    const [text] = opsAlert.mock.lastCall ?? [];
    expect(text).toContain(volunteerPerson.name);
    expect(text).toContain(`id:${volunteer.id}`);
  });

  it("does not alert when a coordinator edits a volunteer", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/volunteer/${volunteer.id}?language=en`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { statusEngagement: VolunteerStateEngagementType.ACTIVE },
    });
    expect(res.statusCode).toBe(200);

    expect(opsAlert).not.toHaveBeenCalled();
  });

  it("alerts when an agent edits their NGO's opportunity", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { statusOpportunity: OpportunityStatusType.SEARCHING },
    });
    expect(res.statusCode).toBe(204);

    expect(opsAlert).toHaveBeenCalledTimes(1);
    const [text] = opsAlert.mock.lastCall ?? [];
    expect(text).toContain(opportunityTitle);
    expect(text).toContain(`id:${opportunity.id}`);
    expect(text).toContain(agentTitle);
  });

  it("does not alert when a coordinator edits an opportunity", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { statusOpportunity: OpportunityStatusType.NEW },
    });
    expect(res.statusCode).toBe(204);

    expect(opsAlert).not.toHaveBeenCalled();
  });
});

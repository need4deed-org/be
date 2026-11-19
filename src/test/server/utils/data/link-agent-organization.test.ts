import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Agent from "../../../../data/entity/opportunity/agent.entity";
import Organization from "../../../../data/entity/organization.entity";
import Person from "../../../../data/entity/person.entity";
import User from "../../../../data/entity/user.entity";
import { linkAgentToDomainOrganization } from "../../../../server/utils/data/link-agent-organization";
import { randomNumericSuffix } from "../../../random";

describe("linkAgentToDomainOrganization", () => {
  const suffix = randomNumericSuffix();
  const domain = `traeger-${suffix}.example`;
  const agentIds: number[] = [];
  const personIds: number[] = [];
  let traeger: Organization;
  let otherTraeger: Organization;

  async function createAgent(
    members: {
      email?: string;
      userEmail?: string;
      role?: AgentRoleType;
      status?: AgentMembershipStatus;
    }[],
    organizationId?: number,
  ): Promise<Agent> {
    const agent = await dataSource.getRepository(Agent).save(
      new Agent({
        title: `Link Test ${suffix}-${agentIds.length}`,
        organizationId,
      }),
    );
    agentIds.push(agent.id);
    for (const member of members) {
      const person = await dataSource
        .getRepository(Person)
        .save(new Person({ firstName: "Link", email: member.email }));
      personIds.push(person.id);
      if (member.userEmail) {
        await dataSource.getRepository(User).save(
          new User({
            email: member.userEmail,
            password: "x",
            role: UserRole.AGENT,
            personId: person.id,
          }),
        );
      }
      await dataSource.getRepository(AgentPerson).save(
        new AgentPerson({
          agentId: agent.id,
          personId: person.id,
          role: member.role ?? AgentRoleType.VOLUNTEER_COORDINATOR,
          status: member.status ?? AgentMembershipStatus.ACTIVE,
        }),
      );
    }
    return agent;
  }

  const organizationIdOf = async (agent: Agent) =>
    (await dataSource.getRepository(Agent).findOneByOrFail({ id: agent.id }))
      .organizationId;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const repository = dataSource.getRepository(Organization);
    traeger = await repository.save(
      new Organization({ title: `Link Träger ${suffix}`, website: domain }),
    );
    otherTraeger = await repository.save(
      new Organization({
        title: `Other Träger ${suffix}`,
        website: `https://www.other-${suffix}.example/about`,
      }),
    );
  });

  afterAll(async () => {
    await dataSource.getRepository(Agent).delete(agentIds);
    await dataSource
      .getRepository(User)
      .createQueryBuilder()
      .delete()
      .where("person_id IN (:...personIds)", { personIds })
      .execute();
    await dataSource.getRepository(Person).delete(personIds);
    await dataSource
      .getRepository(Organization)
      .delete([traeger.id, otherTraeger.id]);
  });

  it("links an Einrichtung whose contact's email domain is a Träger's website", async () => {
    const agent = await createAgent([{ email: `lead@${domain}` }]);
    expect(
      await linkAgentToDomainOrganization(dataSource.manager, agent.id),
    ).toBe(true);
    expect(await organizationIdOf(agent)).toBe(traeger.id);
  });

  it("matches a website stored as a full URL", async () => {
    const agent = await createAgent([
      { email: `Lead@Other-${suffix}.example` },
    ]);
    await linkAgentToDomainOrganization(dataSource.manager, agent.id);
    expect(await organizationIdOf(agent)).toBe(otherTraeger.id);
  });

  it("uses a member's login email when the person has none", async () => {
    const agent = await createAgent([
      { userEmail: `login-${suffix}@${domain}` },
    ]);
    await linkAgentToDomainOrganization(dataSource.manager, agent.id);
    expect(await organizationIdOf(agent)).toBe(traeger.id);
  });

  it("falls back to members' work emails when the contact uses webmail", async () => {
    const agent = await createAgent([
      { email: `lead-${suffix}@web.de` },
      { email: `staff@${domain}`, role: AgentRoleType.OTHER },
    ]);
    await linkAgentToDomainOrganization(dataSource.manager, agent.id);
    expect(await organizationIdOf(agent)).toBe(traeger.id);
  });

  it("never links on webmail alone", async () => {
    const agent = await createAgent([
      { email: `lead-${suffix}@gmail.com` },
      { email: `staff-${suffix}@web.de`, role: AgentRoleType.OTHER },
    ]);
    expect(
      await linkAgentToDomainOrganization(dataSource.manager, agent.id),
    ).toBe(false);
    expect(await organizationIdOf(agent)).toBeNull();
  });

  it("ignores an email without @", async () => {
    await dataSource
      .getRepository(Organization)
      .update({ id: traeger.id }, { title: `traeger${suffix}` });
    try {
      const agent = await createAgent([{ email: `traeger${suffix}` }]);
      await linkAgentToDomainOrganization(dataSource.manager, agent.id);
      expect(await organizationIdOf(agent)).toBeNull();
    } finally {
      await dataSource
        .getRepository(Organization)
        .update({ id: traeger.id }, { title: `Link Träger ${suffix}` });
    }
  });

  it("ignores need4deed staff who are members", async () => {
    const agent = await createAgent([
      { email: `coordinator-${suffix}@need4deed.org` },
    ]);
    expect(
      await linkAgentToDomainOrganization(dataSource.manager, agent.id),
    ).toBe(false);
    expect(await organizationIdOf(agent)).toBeNull();
  });

  it("ignores pending join requests", async () => {
    const agent = await createAgent([
      { email: `pending@${domain}`, status: AgentMembershipStatus.PENDING },
    ]);
    await linkAgentToDomainOrganization(dataSource.manager, agent.id);
    expect(await organizationIdOf(agent)).toBeNull();
  });

  it("skips members spread over several Träger", async () => {
    const agent = await createAgent([
      { email: `lead-${suffix}@gmail.com` },
      { email: `a@${domain}`, role: AgentRoleType.OTHER },
      { email: `b@other-${suffix}.example`, role: AgentRoleType.OTHER },
    ]);
    await linkAgentToDomainOrganization(dataSource.manager, agent.id);
    expect(await organizationIdOf(agent)).toBeNull();
  });

  it("doesn't let a member stand in for a coordinator without email", async () => {
    const agent = await createAgent([
      {},
      { email: `a@${domain}`, role: AgentRoleType.OTHER },
      { email: `b@other-${suffix}.example`, role: AgentRoleType.OTHER },
    ]);
    await linkAgentToDomainOrganization(dataSource.manager, agent.id);
    expect(await organizationIdOf(agent)).toBeNull();
  });

  it("never overwrites an existing link", async () => {
    const agent = await createAgent(
      [{ email: `lead@${domain}` }],
      otherTraeger.id,
    );
    expect(
      await linkAgentToDomainOrganization(dataSource.manager, agent.id),
    ).toBe(false);
    expect(await organizationIdOf(agent)).toBe(otherTraeger.id);
  });
});

import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Agent from "../../../../data/entity/opportunity/agent.entity";
import Person from "../../../../data/entity/person.entity";
import User from "../../../../data/entity/user.entity";
import { hashPassword } from "../../../../data/utils";
import { createAgentContact } from "../../../../server/utils/data/create-agent-contact";

// be#1048: adding a contact by an email that already belongs to a
// registered AGENT user used to always mint a brand-new, disconnected
// Person — so that person never actually got access to the new agent.
describe("createAgentContact links an existing AGENT user (be#1048)", () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const createdAgentIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await dataSource.getRepository(User).delete({ id });
    }
    // Deleting the Agent cascades its AgentPerson rows (onDelete: "CASCADE"
    // on AgentPerson.agent) — must happen before deleting the Persons they
    // reference.
    for (const id of createdAgentIds) {
      await dataSource.getRepository(Agent).delete({ id });
    }
    for (const id of createdPersonIds) {
      await dataSource.getRepository(Person).delete({ id });
    }
    await dataSource.destroy();
  });

  async function makeAgentUser(email: string) {
    const person = await dataSource
      .getRepository(Person)
      .save(new Person({ firstName: "Liam", lastName: "Existing" }));
    createdPersonIds.push(person.id);
    const user = await dataSource.getRepository(User).save(
      new User({
        email,
        password: await hashPassword("test_password"),
        role: UserRole.AGENT,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    return person;
  }

  it("links the existing Person (with an AGENT user) instead of creating a duplicate", async () => {
    const email = `liam-${suffix}@example.com`;
    const existingPerson = await makeAgentUser(email);

    const targetAgent = await dataSource
      .getRepository(Agent)
      .save(new Agent({ title: `Second NGO ${suffix}` }));
    createdAgentIds.push(targetAgent.id);

    const membership = await createAgentContact(targetAgent.id, {
      firstName: "Liam",
      lastName: "Whatever",
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
      email,
    });

    expect(membership.personId).toBe(existingPerson.id);
    expect(membership.agentId).toBe(targetAgent.id);
    expect(membership.status).toBe(AgentMembershipStatus.ACTIVE);

    // No duplicate Person was minted for this email — the User carries it
    // (Person.email is unset in this fixture, matching real agent data).
    const personCount = await dataSource
      .getRepository(User)
      .count({ where: { email } });
    expect(personCount).toBe(1);
  });

  it("is idempotent for the same (agent, person, role)", async () => {
    const email = `liam-repeat-${suffix}@example.com`;
    const existingPerson = await makeAgentUser(email);

    const targetAgent = await dataSource
      .getRepository(Agent)
      .save(new Agent({ title: `Repeat NGO ${suffix}` }));
    createdAgentIds.push(targetAgent.id);

    const first = await createAgentContact(targetAgent.id, {
      firstName: "Liam",
      lastName: "Whatever",
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
      email,
    });
    const second = await createAgentContact(targetAgent.id, {
      firstName: "Liam",
      lastName: "Whatever",
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
      email,
    });

    expect(second.id).toBe(first.id);
    const memberships = await dataSource.getRepository(AgentPerson).count({
      where: { agentId: targetAgent.id, personId: existingPerson.id },
    });
    expect(memberships).toBe(1);
  });

  it("creates a new, disconnected Person when the email belongs to a non-AGENT user", async () => {
    const email = `volunteer-only-${suffix}@example.com`;
    const person = await dataSource
      .getRepository(Person)
      .save(new Person({ firstName: "Vera", lastName: "Volunteer" }));
    createdPersonIds.push(person.id);
    const user = await dataSource.getRepository(User).save(
      new User({
        email,
        password: await hashPassword("test_password"),
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);

    const targetAgent = await dataSource
      .getRepository(Agent)
      .save(new Agent({ title: `Volunteer-only NGO ${suffix}` }));
    createdAgentIds.push(targetAgent.id);

    const membership = await createAgentContact(targetAgent.id, {
      firstName: "Vera",
      lastName: "Volunteer",
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
      email,
    });

    expect(membership.personId).not.toBe(person.id);
    createdPersonIds.push(membership.personId);
  });

  it("creates a new Person as before when no email is given", async () => {
    const targetAgent = await dataSource
      .getRepository(Agent)
      .save(new Agent({ title: `No-email NGO ${suffix}` }));
    createdAgentIds.push(targetAgent.id);

    const membership = await createAgentContact(targetAgent.id, {
      firstName: "No",
      lastName: "Email",
      role: AgentRoleType.OTHER,
    });

    expect(membership.person.firstName).toBe("No");
    createdPersonIds.push(membership.personId);
  });
});

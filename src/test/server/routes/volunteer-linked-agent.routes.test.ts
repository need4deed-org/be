import { FastifyInstance } from "fastify";
import {
  AgentMembershipStatus,
  AgentRoleType,
  UserRole,
  VolunteerAuditLogType,
  volunteerLinkedAgentPath,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import VolunteerAgentLink from "../../../data/entity/volunteer/volunteer-agent-link.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

type Caller = "coordinator" | "ngo";

describe("DELETE /volunteer/:id/linked-agent/:agentId", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const mail = (name: string) => `unlink-${name}-${suffix}@test.need4deed.org`;
  const cookies = {} as Record<Caller, string>;
  let agent: Agent;
  let volunteer: Volunteer;
  const persons: Person[] = [];

  const request = (
    method: "GET" | "DELETE",
    url: string,
    as: Caller = "coordinator",
  ) =>
    fastify.inject({
      method,
      url,
      cookies: { [accessCookieName]: cookies[as] },
    });

  const unlink = (as: Caller = "coordinator", agentId = agent.id) =>
    request("DELETE", volunteerLinkedAgentPath(volunteer.id, agentId), as);

  const ngoSees = async () => {
    const profile = await request("GET", `/volunteer/${volunteer.id}`, "ngo");
    const list = await request(
      "GET",
      `/volunteer?filter[ownerAgent]=${agent.id}&filter[search]=${suffix}`,
      "ngo",
    );
    expect(list.statusCode, list.body).toBe(200);
    return {
      email:
        profile.statusCode === 200 ? profile.json().data.person?.email : null,
      listed: (list.json().data as { id: number }[]).some(
        ({ id }) => id === volunteer.id,
      ),
    };
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Unlink Agent ${suffix}` }),
    );
    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Linked",
        lastName: `Volunteer${suffix}`,
        email: mail("volunteer"),
      }),
    );
    persons.push(volunteerPerson);
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );
    await fastify.db.volunteerRepository.manager.insert(
      VolunteerAgentLink,
      new VolunteerAgentLink({ volunteerId: volunteer.id, agentId: agent.id }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      coordinator: UserRole.COORDINATOR,
      ngo: UserRole.AGENT,
    };
    for (const [caller, role] of Object.entries(roles) as [
      Caller,
      UserRole,
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Caller", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      await fastify.db.userRepository.save(
        new User({
          email: mail(caller),
          password: pwHash,
          role,
          isActive: true,
          personId: person.id,
        }),
      );
      if (caller === "ngo") {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: agent.id,
            personId: person.id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: mail(caller), password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    if (!fastify) {
      return;
    }
    if (volunteer) {
      await fastify.db.volunteerAuditLogRepository.delete({
        volunteerId: volunteer.id,
      });
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
      await fastify.db.dealRepository.delete({ id: volunteer.dealId });
    }
    const personIds = persons.map(({ id }) => id);
    await fastify.db.agentPersonRepository.delete({ personId: In(personIds) });
    await fastify.db.userRepository.delete({ personId: In(personIds) });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    if (agent) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify.close();
  });

  it("is staff only", async () => {
    const res = await unlink("ngo");
    expect(res.statusCode).toBe(403);
    expect(await ngoSees()).toEqual({ email: mail("volunteer"), listed: true });
  });

  it("removes the link: the NGO loses the personal data and the listing", async () => {
    const res = await unlink();
    expect(res.statusCode, res.body).toBe(200);
    expect((await unlink()).statusCode).toBe(404);
    const after = await ngoSees();
    expect(after.listed).toBe(false);
    expect(after.email).not.toBe(mail("volunteer"));

    const audit = await fastify.db.volunteerAuditLogRepository.find({
      where: { volunteerId: volunteer.id },
    });
    expect(audit).toMatchObject([
      {
        type: VolunteerAuditLogType.AGENT_UNLINKED,
        detail: `Disconnected from ${agent.title} (id:${agent.id}).`,
      },
    ]);
  });

  it("answers 404 for a link that doesn't exist", async () => {
    expect((await unlink("coordinator", agent.id + 1_000_000)).statusCode).toBe(
      404,
    );
  });
});

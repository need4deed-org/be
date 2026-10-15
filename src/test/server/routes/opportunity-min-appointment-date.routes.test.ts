import { FastifyInstance } from "fastify";
import {
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityLegacyType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { minAppointmentDate } from "../../../server/utils/data/min-appointment-date";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";
const HOUR = 60 * 60 * 1000;

type Caller = "agent" | "coordinator";

const berlinDay = (date: Date) =>
  date.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

describe("accompanying appointments are at least 7 working days out", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `MinAppointment ${suffix}`;

  let agent: Agent;
  let addressId: number;
  let postcodeValue: string;
  const persons: Person[] = [];
  const cookies = {} as Record<Caller, string>;
  const createdOpportunityIds: number[] = [];

  const earliest = () => new Date(minAppointmentDate().getTime() + 10 * HOUR);
  const tooSoon = () => new Date(minAppointmentDate().getTime() - 12 * HOUR);

  const create = (as: Caller, appointment: Date | string) =>
    fastify.inject({
      method: "POST",
      url: "/opportunity/",
      cookies: { [accessCookieName]: cookies[as] },
      payload: {
        title: `${prefix} ${as}`,
        opportunity_type: OpportunityLegacyType.ACCOMPANYING,
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        agent_id: agent.id,
        accomp_address: "Teststraße 1",
        accomp_postcode: postcodeValue,
        accomp_datetime:
          typeof appointment === "string"
            ? appointment
            : appointment.toISOString(),
        accomp_name: "John Doe",
        accomp_phone: "420-024",
        accomp_translation: "deutsche",
      },
    });

  const createdId = (res: { json: () => { data: { id: number } } }) => {
    const { id } = res.json().data;
    createdOpportunityIds.push(id);
    return id;
  };

  const appointment = (appointmentDate: string, appointmentTime: string) => ({
    accompanyingDetails: {
      appointmentDate,
      appointmentTime,
      appointmentAddress: "Teststraße 2",
      refugeeName: "John Doe",
    },
  });

  const patch = (id: number, payload: Record<string, unknown>) =>
    fastify.inject({
      method: "PATCH",
      url: `/opportunity/${id}`,
      cookies: { [accessCookieName]: cookies.agent },
      payload,
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    postcodeValue = postcode.value;
    const address = await getRepository(dataSource, Address).save(
      new Address({ postcodeId: postcode.id }),
    );
    addressId = address.id;
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `${prefix} agent`, addressId }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      agent: UserRole.AGENT,
      coordinator: UserRole.COORDINATOR,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Min", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const email = `min-appointment-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      if (caller === "agent") {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: agent.id,
            personId: person.id,
            role: AgentRoleType.SOCIAL_WORKER,
            status: AgentMembershipStatus.ACTIVE,
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
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: addressId });
    await fastify.close();
  });

  describe("POST /opportunity", () => {
    it("rejects an agent's appointment before the 7th working day", async () => {
      const res = await create("agent", tooSoon());

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain("at least 7 working days");
    });

    it("accepts an agent's appointment on the 7th working day", async () => {
      const res = await create("agent", earliest());

      expect(res.statusCode).toBe(201);
      createdId(res);
    });

    it("rejects an unparseable appointment date", async () => {
      const res = await create("agent", "not-a-date");

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe("The appointment date is invalid.");
    });

    it("lets a coordinator set a sooner appointment", async () => {
      const res = await create("coordinator", tooSoon());

      expect(res.statusCode).toBe(201);
      createdId(res);
    });
  });

  describe("PATCH /opportunity/:id by an agent", () => {
    let insideWindowId: number;

    beforeAll(async () => {
      insideWindowId = createdId(await create("coordinator", tooSoon()));
    });

    it("still edits other fields of an opportunity inside the window", async () => {
      const res = await patch(insideWindowId, { title: `${prefix} renamed` });

      expect(res.statusCode).toBe(204);
    });

    it("keeps the day while changing the time", async () => {
      const res = await patch(
        insideWindowId,
        appointment(berlinDay(tooSoon()), "15:00"),
      );

      expect(res.statusCode).toBe(204);
    });

    it("rejects moving the appointment to a day before the 7th working day", async () => {
      const res = await patch(
        insideWindowId,
        appointment(berlinDay(new Date()), "15:00"),
      );

      expect(res.statusCode).toBe(400);
    });

    it("accepts moving the appointment to the 7th working day", async () => {
      const res = await patch(
        insideWindowId,
        appointment(berlinDay(earliest()), "10:00"),
      );

      expect(res.statusCode).toBe(204);
    });
  });

  it("rejects a too-soon appointment on the public legacy form", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity/legacy",
      payload: {
        title: `${prefix} legacy`,
        opportunity_type: OpportunityLegacyType.ACCOMPANYING,
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        languages: [],
        activities: [],
        skills: [],
        rac_address: `Teststrasse-${suffix} 1`,
        rac_plz: postcodeValue,
        accomp_address: "Teststraße 1",
        accomp_postcode: postcodeValue,
        accomp_datetime: tooSoon().toISOString(),
        accomp_name: "John Doe",
        accomp_phone: "420-024",
        accomp_translation: "deutsche",
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

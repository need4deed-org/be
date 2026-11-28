import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentRoleType,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getPostcode, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix, uniqueRemoteAddress } from "../../random";

const PASSWORD = "registration_password";
const NEW_PASSWORD = "chosen_after_verify";

describe("POST /user → verify-email → login", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const domain = `self-reg-${suffix}.example`;
  const mail = (name: string) => `${name}-${suffix}@${domain}`;
  const emails: string[] = [];
  const personIds: number[] = [];
  const agentIds: number[] = [];
  const volunteerIds: number[] = [];
  const dealIds: number[] = [];

  function register(
    name: string,
    extra: { role?: UserRole; ngoToken?: string; ip?: string } = {},
  ) {
    const email = mail(name);
    if (!emails.includes(email)) {
      emails.push(email);
    }
    return fastify.inject({
      method: "POST",
      remoteAddress: extra.ip ?? uniqueRemoteAddress(),
      url: "/user",
      payload: {
        email,
        password: PASSWORD,
        role: extra.role ?? UserRole.VOLUNTEER,
        person: { firstName: "Registration", lastName: name },
        ...(extra.ngoToken ? { ngoToken: extra.ngoToken } : {}),
      },
    });
  }

  function verifyToken(userId: number, name: string) {
    return fastify.jwt.sign({ id: userId, email: mail(name), type: "verify" });
  }

  function verify(token: string) {
    return fastify.inject({
      method: "POST",
      url: "/user/verify-email",
      payload: { token },
    });
  }

  function login(name: string, password: string) {
    return fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: mail(name), password },
    });
  }

  function resetPassword(token: string) {
    return fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token, newPassword: NEW_PASSWORD },
    });
  }

  async function savePerson(name: string) {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Legacy", lastName: name, email: mail(name) }),
    );
    personIds.push(person.id);
    return person;
  }

  async function saveVolunteer(person: Person) {
    const postcode = await getPostcode("10115");
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    dealIds.push(deal.id);
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ personId: person.id, dealId: deal.id }),
    );
    volunteerIds.push(volunteer.id);
    return volunteer;
  }

  async function saveAgent(name: string) {
    const agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Self-reg ${name} ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    agentIds.push(agent.id);
    return agent;
  }

  const userOf = (name: string) =>
    fastify.db.userRepository.findOneByOrFail({ email: mail(name) });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    vi.spyOn(fastify.notify, "emailVerification").mockResolvedValue(undefined);
    vi.spyOn(fastify.notify, "passwordReset").mockResolvedValue(undefined);
    await fastify.db.trustedDomainRepository.save(
      new TrustedDomain({ domain }),
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const users = await fastify.db.userRepository.findBy({
      email: In(emails),
    });
    personIds.push(...users.map((user) => user.personId));
    await fastify.db.userRepository.delete({ email: In(emails) });
    await fastify.db.volunteerRepository.delete({ id: In(volunteerIds) });
    await fastify.db.dealRepository.delete({ id: In(dealIds) });
    await fastify.db.agentPersonRepository.delete({ agentId: In(agentIds) });
    await fastify.db.agentRepository.delete({ id: In(agentIds) });
    await fastify.db.personRepository.delete({ email: In(emails) });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    await fastify.db.trustedDomainRepository.delete({ domain });
    await fastify.close();
  });

  it("new volunteer: registers, verifies and logs in with the registration password", async () => {
    const res = await register("new-volunteer");
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: res.json().id, isActive: false });
    const pending = await userOf("new-volunteer");
    expect(pending.personId).toBeTruthy();
    const personEmail = async () =>
      (
        await fastify.db.personRepository.findOneByOrFail({
          id: pending.personId,
        })
      ).email;
    expect(await personEmail()).toBeNull();

    const verified = await verify(verifyToken(pending.id, "new-volunteer"));
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).toMatchObject({
      verified: true,
      hasVolunteerProfile: false,
    });
    expect(verified.json()).not.toHaveProperty("setPassword");
    expect(verified.json()).not.toHaveProperty("resetToken");
    expect(await personEmail()).toBe(mail("new-volunteer"));

    expect((await login("new-volunteer", PASSWORD)).statusCode).toBe(200);
  });

  it("legacy volunteer: gets the existing profile only after verifying, and must set a new password", async () => {
    const legacy = await savePerson("legacy-volunteer");
    await saveVolunteer(legacy);

    const res = await register("legacy-volunteer");
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: res.json().id, isActive: false });
    const pending = await userOf("legacy-volunteer");
    expect(pending.personId).not.toBe(legacy.id);

    const verified = await verify(verifyToken(pending.id, "legacy-volunteer"));
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).toMatchObject({
      verified: true,
      hasVolunteerProfile: true,
      setPassword: true,
    });
    const activated = await userOf("legacy-volunteer");
    expect(activated.isActive).toBe(true);
    expect(activated.personId).toBe(legacy.id);
    expect(activated.credentialsValidAfter).toBeNull();
    expect(fastify.notify.passwordReset).toHaveBeenCalledWith(
      expect.objectContaining({ id: pending.id }),
    );

    expect((await login("legacy-volunteer", PASSWORD)).statusCode).toBe(401);

    const reset = await resetPassword(verified.json().resetToken);
    expect(reset.statusCode).toBe(200);
    expect((await login("legacy-volunteer", NEW_PASSWORD)).statusCode).toBe(
      200,
    );
    const reloaded = await fastify.db.personRepository.findOneByOrFail({
      id: legacy.id,
    });
    expect(reloaded.firstName).toBe("Legacy");
    expect(
      await fastify.db.personRepository.countBy({
        email: mail("legacy-volunteer"),
      }),
    ).toBe(1);
  });

  it("NGO-link volunteer: registers with an ngoToken, verifies and logs in", async () => {
    const agent = await saveAgent("link");
    const ngoToken = fastify.jwt.sign({
      agentId: agent.id,
      type: "ngo-registration",
    });

    const res = await register("ngo-link-volunteer", { ngoToken });
    expect(res.statusCode).toBe(201);
    const pending = await userOf("ngo-link-volunteer");

    const verified = await verify(
      verifyToken(pending.id, "ngo-link-volunteer"),
    );
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).not.toHaveProperty("setPassword");

    expect((await login("ngo-link-volunteer", PASSWORD)).statusCode).toBe(200);
  });

  it("NGO user: registers as agent, verifies and logs in", async () => {
    const res = await register("ngo-user", { role: UserRole.AGENT });
    expect(res.statusCode).toBe(201);
    const pending = await userOf("ngo-user");
    expect(pending.personId).toBeTruthy();

    const verified = await verify(verifyToken(pending.id, "ngo-user"));
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).not.toHaveProperty("setPassword");

    expect((await login("ngo-user", PASSWORD)).statusCode).toBe(200);
  });

  it("legacy NGO contact: after verifying, the verify token still opens the agent complete step", async () => {
    const contact = await savePerson("ngo-contact");
    const agent = await saveAgent("contact");
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: contact.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );

    expect(
      (await register("ngo-contact", { role: UserRole.AGENT })).statusCode,
    ).toBe(201);
    const pending = await userOf("ngo-contact");
    expect(pending.personId).not.toBe(contact.id);

    const token = verifyToken(pending.id, "ngo-contact");
    const verified = await verify(token);
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).toMatchObject({ setPassword: true });
    expect((await userOf("ngo-contact")).personId).toBe(contact.id);

    const status = await fastify.inject({
      url: `/agent/register/status?token=${token}`,
    });
    expect(status.statusCode).toBe(200);

    expect((await resetPassword(verified.json().resetToken)).statusCode).toBe(
      200,
    );
    expect((await login("ngo-contact", NEW_PASSWORD)).statusCode).toBe(200);
  });

  it("keeps the registration Person when the matched one was claimed meanwhile", async () => {
    const legacy = await savePerson("claimed-meanwhile");
    expect((await register("claimed-meanwhile")).statusCode).toBe(201);
    const pending = await userOf("claimed-meanwhile");
    expect(pending.personId).not.toBe(legacy.id);

    const otherEmail = `other-${mail("claimed-meanwhile")}`;
    emails.push(otherEmail);
    await fastify.db.userRepository.save(
      new User({
        email: otherEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.VOLUNTEER,
        isActive: true,
        language: "en",
        timezone: "CET",
        personId: legacy.id,
      }),
    );

    const verified = await verify(verifyToken(pending.id, "claimed-meanwhile"));
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).not.toHaveProperty("setPassword");
    const activated = await userOf("claimed-meanwhile");
    expect(activated.personId).toBe(pending.personId);
    const person = await fastify.db.personRepository.findOneByOrFail({
      id: activated.personId,
    });
    expect(person).toMatchObject({
      firstName: "Registration",
      lastName: "claimed-meanwhile",
      email: mail("claimed-meanwhile"),
    });
    expect((await login("claimed-meanwhile", PASSWORD)).statusCode).toBe(200);
  });

  it("discards the registration password of a pending user linked to an older Person before verification existed", async () => {
    const legacy = await savePerson("linked-before");
    const pendingUser = await fastify.db.userRepository.save(
      new User({
        email: mail("linked-before"),
        password: await hashPassword(PASSWORD),
        role: UserRole.VOLUNTEER,
        isActive: false,
        language: "en",
        timezone: "CET",
        personId: legacy.id,
      }),
    );
    emails.push(mail("linked-before"));

    const verified = await verify(verifyToken(pendingUser.id, "linked-before"));
    expect(verified.statusCode).toBe(200);
    expect(verified.json()).toMatchObject({ setPassword: true });
    expect((await login("linked-before", PASSWORD)).statusCode).toBe(401);
  });

  it("keeps the older Person a pending user already held, even with an unclaimed duplicate", async () => {
    const held = await savePerson("held-older");
    const pendingUser = await fastify.db.userRepository.save(
      new User({
        email: mail("held-older"),
        password: await hashPassword(PASSWORD),
        role: UserRole.VOLUNTEER,
        isActive: false,
        language: "en",
        timezone: "CET",
        personId: held.id,
      }),
    );
    emails.push(mail("held-older"));
    const duplicate = await savePerson("held-older");

    const verified = await verify(verifyToken(pendingUser.id, "held-older"));

    expect(verified.statusCode).toBe(200);
    expect(verified.json()).toMatchObject({ setPassword: true });
    expect((await userOf("held-older")).personId).toBe(held.id);
    expect(
      await fastify.db.personRepository.countBy({ id: duplicate.id }),
    ).toBe(1);
  });

  it("links the unclaimed Person when a claimed one shares the email", async () => {
    const claimed = await savePerson("shared-email");
    const otherEmail = `claimer-${mail("shared-email")}`;
    emails.push(otherEmail);
    await fastify.db.userRepository.save(
      new User({
        email: otherEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.VOLUNTEER,
        isActive: true,
        language: "en",
        timezone: "CET",
        personId: claimed.id,
      }),
    );
    const unclaimed = await savePerson("shared-email");

    expect((await register("shared-email")).statusCode).toBe(201);
    const pending = await userOf("shared-email");
    expect(pending.personId).not.toBe(unclaimed.id);

    expect(
      (await verify(verifyToken(pending.id, "shared-email"))).statusCode,
    ).toBe(200);
    expect((await userOf("shared-email")).personId).toBe(unclaimed.id);
  });

  it("activates once when the verify link is opened twice at the same time", async () => {
    await savePerson("double-verify");
    expect((await register("double-verify")).statusCode).toBe(201);
    const token = verifyToken(
      (await userOf("double-verify")).id,
      "double-verify",
    );

    const statuses = (await Promise.all([verify(token), verify(token)]))
      .map((res) => res.statusCode)
      .sort();

    expect(statuses).toEqual([200, 409]);
  });

  it("429s the 21st registration from one IP within the window", async () => {
    const ip = uniqueRemoteAddress();
    for (let i = 0; i < 20; i++) {
      expect((await register(`ip-limit-${i}`, { ip })).statusCode).toBe(201);
    }
    expect((await register("ip-limit-20", { ip })).statusCode).toBe(429);
  });
});

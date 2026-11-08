import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  ApiVolunteerImportResult,
  ApiVolunteerImportRow,
  UserRole,
} from "need4deed-sdk";
import { In, Raw } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Caller = "admin" | "coordinator";

describe("POST /agent/:id/volunteer-import (be#1332)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const mail = (name: string) => `import-${name}-${suffix}@test.need4deed.org`;

  let agent: Agent;
  let postcode: string;
  let postcodeId: number;
  let createdPostcode: Postcode | undefined;
  let existingVolunteer: Volunteer;
  let loosePerson: Person;
  const cookies = {} as Record<Caller, string>;

  const row = (
    name: string,
    over: Partial<ApiVolunteerImportRow> = {},
  ): ApiVolunteerImportRow => ({
    firstName: `Imported ${name}`,
    lastName: `${suffix}`,
    email: mail(name),
    phone: "+49 30 1234567",
    postcode,
    ...over,
  });

  const importRows = (
    rows: ApiVolunteerImportRow[],
    {
      as = "admin",
      dryRun,
      agentId,
    }: {
      as?: Caller;
      dryRun?: boolean;
      agentId?: number;
    } = {},
  ) =>
    fastify.inject({
      method: "POST",
      url: `/agent/${agentId ?? agent.id}/volunteer-import`,
      cookies: { [accessCookieName]: cookies[as] },
      payload: { rows, ...(dryRun !== undefined ? { dryRun } : {}) },
    });

  const ownedVolunteers = () =>
    fastify.db.volunteerRepository.find({
      where: { ownerAgentId: agent.id },
      relations: { person: { address: true }, deal: true },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    vi.spyOn(fastify.notify, "activity").mockResolvedValue(undefined);

    const found =
      (await fastify.db.postcodeRepository.findOne({
        where: { value: Raw((v) => `${v} ~ '^0[0-9]{4}$'`) },
      })) ??
      (createdPostcode = await fastify.db.postcodeRepository.save(
        new Postcode({ value: `0${randomNumericSuffix(4)}` }),
      ));
    postcode = found.value;
    postcodeId = found.id;

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Import Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      admin: UserRole.ADMIN,
      coordinator: UserRole.COORDINATOR,
    };
    for (const [caller, role] of Object.entries(roles) as [
      Caller,
      UserRole,
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Importer", lastName: `${caller}${suffix}` }),
      );
      await fastify.db.userRepository.save(
        new User({
          email: mail(caller),
          password: pwHash,
          role,
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: mail(caller), password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }

    const registered = await fastify.db.personRepository.save(
      new Person({ firstName: "Registered", email: mail("registered") }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: mail("registered"),
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: registered.id,
      }),
    );

    const accountOnly = await fastify.db.personRepository.save(
      new Person({ firstName: "AccountOnly", lastName: `${suffix}` }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: mail("account-only"),
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: accountOnly.id,
      }),
    );

    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Already", email: mail("already") }),
    );
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId }),
    );
    existingVolunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    loosePerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Loose", email: mail("loose") }),
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const volunteers = await fastify.db.volunteerRepository.find({
      where: [{ ownerAgentId: agent.id }, { id: existingVolunteer.id }],
    });
    const volunteerIds = volunteers.map(({ id }) => id);
    await fastify.db.volunteerAuditLogRepository.delete({
      volunteerId: In(volunteerIds),
    });
    await fastify.db.volunteerRepository.delete({ id: In(volunteerIds) });
    await fastify.db.dealRepository.delete({
      id: In(volunteers.map(({ dealId }) => dealId)),
    });
    const persons = await fastify.db.personRepository.find({
      where: [
        { email: Raw((e) => `${e} LIKE '%-${suffix}@test.need4deed.org'`) },
        { lastName: Raw((l) => `${l} LIKE '%${suffix}'`) },
      ],
    });
    const personIds = persons.map(({ id }) => id);
    await fastify.db.userRepository.delete({ personId: In(personIds) });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    const addressIds = persons.flatMap(({ addressId }) =>
      addressId ? [addressId] : [],
    );
    if (addressIds.length > 0) {
      await fastify.db.personRepository.manager
        .getRepository(Address)
        .delete({ id: In(addressIds) });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    if (createdPostcode) {
      await fastify.db.postcodeRepository.delete({ id: createdPostcode.id });
    }
    await fastify.close();
  });

  it("previews a dry run without writing anything", async () => {
    const res = await importRows(
      [
        row("fresh"),
        row("already"),
        row("fresh", { firstName: "Twice" }),
        row("loose", { firstName: "loose" }),
      ],
      { dryRun: true },
    );
    expect(res.statusCode).toBe(200);
    const report: ApiVolunteerImportResult = res.json().data;
    expect(report).toMatchObject({
      dryRun: true,
      created: 2,
      skipped: 2,
      invalid: 0,
    });
    expect(
      report.rows.map(({ outcome, skipReason }) => [outcome, skipReason]),
    ).toEqual([
      ["created", undefined],
      ["skipped", "already-volunteer"],
      ["skipped", "duplicate-in-import"],
      ["created", undefined],
    ]);
    expect(report.rows.every(({ volunteerId }) => !volunteerId)).toBe(true);
    expect(await ownedVolunteers()).toEqual([]);
  });

  it("rejects the whole import when any row is invalid", async () => {
    const res = await importRows([
      row("good"),
      row("blank", { firstName: "  " }),
      row("bad", { email: "not-an-email" }),
      row("nowhere", { postcode: "0000x" }),
      row("registered"),
      row("account-only"),
      row("loose", { firstName: "Anna" }),
    ]);
    expect(res.statusCode).toBe(400);
    const report: ApiVolunteerImportResult = res.json().data;
    expect(report.invalid).toBe(6);
    expect(report.rows[0].outcome).toBe("created");
    expect(report.rows.slice(1).map(({ errors }) => errors)).toEqual([
      ["firstName is required"],
      ["email is not a valid address"],
      ["postcode 0000x is unknown"],
      ["email belongs to a registered account"],
      ["email belongs to a registered account"],
      ["email belongs to an existing person with another name"],
    ]);
    expect(await ownedVolunteers()).toEqual([]);
  });

  it("imports volunteers owned by the NGO, reusing a person without a profile", async () => {
    const res = await importRows([
      row("fresh", {
        email: ` ${mail("fresh").toUpperCase()} `,
        postcode: postcode.slice(1),
      }),
      row("already"),
      row("loose", { firstName: "loose" }),
    ]);
    expect(res.statusCode).toBe(201);
    const report: ApiVolunteerImportResult = res.json().data;
    expect(report).toMatchObject({ dryRun: false, created: 2, skipped: 1 });

    const owned = await ownedVolunteers();
    expect(owned.map(({ id }) => id).sort()).toEqual(
      report.rows
        .flatMap(({ volunteerId }) => (volunteerId ? [volunteerId] : []))
        .sort(),
    );
    const fresh = owned.find(({ person }) => person.email === mail("fresh"));
    expect(fresh?.person).toMatchObject({
      firstName: "Imported fresh",
      phone: "+49 30 1234567",
    });
    expect(fresh?.deal.postcodeId).toBe(postcodeId);
    expect(fresh?.person.address?.postcodeId).toBe(postcodeId);
    expect(
      owned.find(({ personId }) => personId === loosePerson.id)?.person.address
        ?.postcodeId,
    ).toBe(postcodeId);
    expect(
      owned.find(({ personId }) => personId === loosePerson.id),
    ).toBeTruthy();

    const audit = await fastify.db.volunteerAuditLogRepository.find({
      where: { volunteerId: In(owned.map(({ id }) => id)) },
    });
    expect(audit).toHaveLength(2);
    expect(audit[0].detail).toContain(agent.title);
    expect(fastify.notify.activity).toHaveBeenCalledWith(
      expect.stringContaining(agent.title),
    );
  });

  it("is idempotent: importing the same rows again creates nothing", async () => {
    const res = await importRows([
      row("fresh"),
      row("loose", { firstName: "loose" }),
    ]);
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ created: 0, skipped: 2 });
    expect(fastify.notify.activity).toHaveBeenCalledTimes(1);
    expect(await ownedVolunteers()).toHaveLength(2);
  });

  it("403s a coordinator and 404s an unknown NGO", async () => {
    expect(
      (await importRows([row("x")], { as: "coordinator" })).statusCode,
    ).toBe(403);
    expect(
      (await importRows([row("x")], { agentId: 2147483000 })).statusCode,
    ).toBe(404);
  });
});

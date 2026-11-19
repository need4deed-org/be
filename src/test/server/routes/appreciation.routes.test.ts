import { FastifyInstance } from "fastify";
import {
  AppreciationStatusType,
  UserRole,
  VolunteerStateAppreciationType,
} from "need4deed-sdk";
import { In } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { accessCookieName, apiKeyHeaderName } from "../../../config/constants";
import ApiKey from "../../../data/entity/api-key.entity";
import Deal from "../../../data/entity/deal.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Appreciation from "../../../data/entity/volunteer/appreciation.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword, sha256Hex } from "../../../data/utils";
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

// be#909 review: `status` is the new source of truth, but a caller that only
// patches dateDue/dateDelivery (the pre-be#909 contract) must not leave it
// stale — the handler reconciles status from the dates whenever the patch
// itself doesn't include `status`, and never overrides an explicit `status`.
describe("PATCH /appreciation/:id status reconciliation (be#909)", () => {
  let fastify: FastifyInstance;
  let volunteer: Volunteer;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let appreciation: Appreciation;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-appreciation-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: coordinatorUser.email, password: PASSWORD },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.close();
  });

  beforeEach(async () => {
    appreciation = await fastify.db.appreciationRepository.save(
      new Appreciation({
        title: VolunteerStateAppreciationType.T_SHIRT,
        status: AppreciationStatusType.PENDING,
        volunteerId: volunteer.id,
      }),
    );
  });

  afterEach(async () => {
    await fastify.db.appreciationRepository.delete({ id: appreciation.id });
  });

  it("derives status=received when dateDelivery is patched without status", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/appreciation/${appreciation.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { dateDelivery: "2026-08-01T00:00:00.000Z" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe(AppreciationStatusType.RECEIVED);
  });

  it("derives status=pending when dateDue is patched without status and no dateDelivery is set", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/appreciation/${appreciation.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { dateDue: "2026-08-01T00:00:00.000Z" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe(AppreciationStatusType.PENDING);
  });

  it("respects an explicit status instead of deriving it from dates", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/appreciation/${appreciation.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { status: AppreciationStatusType.POST },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe(AppreciationStatusType.POST);
  });

  it("leaves status untouched when the patch touches neither status nor dates", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/appreciation/${appreciation.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { title: VolunteerStateAppreciationType.CAP },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe(AppreciationStatusType.PENDING);
  });
});

describe("PATCH/DELETE /appreciation/:id authorize on the DB user", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const personIds: number[] = [];
  let deal: Deal;
  let volunteer: Volunteer;
  let promotedCookie: string;
  let apiKeyUser: User;
  const rawApiKey = `n4d_appreciation-${suffix}`;

  async function createUser(label: string, role: UserRole): Promise<User> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: label }),
    );
    personIds.push(person.id);
    return fastify.db.userRepository.save(
      new User({
        email: `${label}-appreciation-auth-${suffix}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
  }

  const createAppreciation = () =>
    fastify.db.appreciationRepository.save(
      new Appreciation({
        title: VolunteerStateAppreciationType.T_SHIRT,
        status: AppreciationStatusType.PENDING,
        volunteerId: volunteer.id,
      }),
    );

  const callers = [
    {
      name: "a token whose role was promoted in the DB",
      auth: () => ({ cookies: { [accessCookieName]: promotedCookie } }),
    },
    {
      name: "an API key",
      auth: () => ({ headers: { [apiKeyHeaderName]: rawApiKey } }),
    },
  ];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    personIds.push(volunteerPerson.id);
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    const promoted = await createUser("promoted", UserRole.VOLUNTEER);
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: promoted.email, password: PASSWORD },
    });
    promotedCookie = getCookie(login.cookies, accessCookieName);
    await fastify.db.userRepository.update(promoted.id, {
      role: UserRole.COORDINATOR,
    });

    apiKeyUser = await createUser("api-key", UserRole.COORDINATOR);
    await fastify.db.apiKeyRepository.save(
      new ApiKey({
        label: `appreciation-auth-${suffix}`,
        keyHash: sha256Hex(rawApiKey),
        userId: apiKeyUser.id,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.appreciationRepository.delete({
      volunteerId: volunteer.id,
    });
    await fastify.db.apiKeyRepository.delete({ userId: apiKeyUser.id });
    await fastify.db.userRepository.delete({ personId: In(personIds) });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete(personIds);
    await fastify.close();
  });

  describe.each(callers)("with $name", ({ auth }) => {
    it("updates the appreciation", async () => {
      const appreciation = await createAppreciation();
      const res = await fastify.inject({
        method: "PATCH",
        url: `/appreciation/${appreciation.id}`,
        ...auth(),
        payload: { status: AppreciationStatusType.POST },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe(AppreciationStatusType.POST);
    });

    it("deletes the appreciation", async () => {
      const appreciation = await createAppreciation();
      const res = await fastify.inject({
        method: "DELETE",
        url: `/appreciation/${appreciation.id}`,
        ...auth(),
      });

      expect(res.statusCode).toBe(200);
      expect(
        await fastify.db.appreciationRepository.findOneBy({
          id: appreciation.id,
        }),
      ).toBeNull();
    });
  });
});

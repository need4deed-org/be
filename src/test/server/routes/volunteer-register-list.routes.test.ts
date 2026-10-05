import { FastifyInstance } from "fastify";
import { UserRole, VolunteerStateEngagementType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

// be#1110: a self-registered volunteer was reported as not showing up at the
// top of the coordinator dashboard's Volunteers list. This replays fe's exact
// default list request (VolunteerListController: newest first, every
// engagement except inactive, table view) right after a self-registration.
describe("GET /volunteer after POST /volunteer/register (be#1110)", () => {
  let fastify: FastifyInstance;
  let coordinatorCookie: string;

  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];
  const createdVolunteerIds: number[] = [];
  const createdDealIds: number[] = [];

  async function makeUser(role: UserRole): Promise<User> {
    const suffix = randomNumericSuffix();
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: `List${suffix}` }),
    );
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `vol-register-list-${role}-${suffix}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    return user;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const coordinator = await makeUser(UserRole.COORDINATOR);
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: coordinator.email, password: PASSWORD },
    });
    const cookie = res.cookies.find((c) => c.name === accessCookieName);
    if (!cookie) {
      throw new Error("coordinator login failed");
    }
    coordinatorCookie = cookie.value;
  });

  afterAll(async () => {
    for (const id of createdVolunteerIds) {
      await fastify.db.volunteerRepository.delete({ id });
    }
    for (const id of createdDealIds) {
      await fastify.db.dealRepository.delete({ id });
    }
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.close();
  });

  it("lists a freshly self-registered volunteer as NEW, ahead of every older volunteer", async () => {
    const registrant = await makeUser(UserRole.VOLUNTEER);
    const token = fastify.jwt.sign({
      id: registrant.id,
      email: registrant.email,
      type: "verify",
    });

    const reg = await fastify.inject({
      method: "POST",
      url: `/volunteer/register?token=${token}`,
      payload: {
        addressPostcode: "10115",
        locations: [],
        languages: [],
        availability: [{ day: "Monday", daytime: "08-11" }],
        activities: [],
        skills: [],
        leadFrom: [],
        goodConductCertificate: "undefined",
        measlesVaccination: "undefined",
        comments: "",
      },
    });
    expect(reg.statusCode).toBe(201);
    const volunteerId: number = reg.json().data.id;
    createdVolunteerIds.push(volunteerId);
    const volunteer = await fastify.db.volunteerRepository.findOneByOrFail({
      id: volunteerId,
    });
    createdDealIds.push(volunteer.dealId);
    expect(volunteer.statusEngagement).toBe(VolunteerStateEngagementType.NEW);

    // fe strips the "vol-" prefix and axios serializes the filter object in
    // bracket notation (filter[engagement][]=new&...).
    const engagement = Object.values(VolunteerStateEngagementType)
      .filter((e) => e !== VolunteerStateEngagementType.INACTIVE)
      .map((e) => `filter[engagement][]=${e.replace(/^vol-/, "")}`)
      .join("&");
    // fe uses limit=20; a wider page keeps this robust against volunteers
    // other test files create in parallel.
    const res = await fastify.inject({
      method: "GET",
      url: `/volunteer?limit=100&page=1&sortOrder=new-old&listType=table&${engagement}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const ids: number[] = res.json().data.map((v: { id: number }) => v.id);
    const index = ids.indexOf(volunteerId);
    expect(index).toBeGreaterThanOrEqual(0);
    // Everything listed above it must be newer (created concurrently).
    expect(ids.slice(0, index).every((id) => id > volunteerId)).toBe(true);
  });
});

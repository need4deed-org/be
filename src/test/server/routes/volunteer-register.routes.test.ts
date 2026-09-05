import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Person from "../../../data/entity/person.entity";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import User from "../../../data/entity/user.entity";
import {
  getRepository,
  getRRULE,
  getStartEnd,
  hashPassword,
} from "../../../data/utils";
import { createServer } from "../../../server";
import { getTimeslot } from "../../../server/utils";

// be#943: POST /volunteer/register?token=<verify-jwt> — the self-service
// endpoint fe#972's ProfileCompletion form submits to, mirroring
// POST /agent/register's token-auth pattern (be#591).
describe("POST /volunteer/register", () => {
  let fastify: FastifyInstance;

  const password = "test_password";
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];
  const createdVolunteerIds: number[] = [];
  const createdDealIds: number[] = [];

  async function makeRegistrant(role: UserRole = UserRole.VOLUNTEER): Promise<{
    person: Person;
    user: User;
    token: string;
  }> {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `registrant-${suffix}@example.com`,
        password: await hashPassword(password),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });
    return { person, user, token };
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
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

  it("400s with no token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/volunteer/register",
      payload: { addressPostcode: "10115" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("401s with an invalid token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/volunteer/register?token=not-a-real-token",
      payload: { addressPostcode: "10115" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403s a verify token for a non-VOLUNTEER/ADMIN role", async () => {
    const { token } = await makeRegistrant(UserRole.AGENT);

    const res = await fastify.inject({
      method: "POST",
      url: `/volunteer/register?token=${token}`,
      payload: { addressPostcode: "10115" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("creates a Volunteer linked to the registrant's own Person, minimal payload", async () => {
    const { person, token } = await makeRegistrant();

    const res = await fastify.inject({
      method: "POST",
      url: `/volunteer/register?token=${token}`,
      payload: {
        addressPostcode: "10115",
        locations: [],
        languages: [],
        availability: [],
        activities: [],
        skills: [],
        leadFrom: [],
        goodConductCertificate: "undefined",
        measlesVaccination: "undefined",
        comments: "test comment",
      },
    });

    expect(res.statusCode).toBe(201);
    const volunteerId = res.json().data.id;
    createdVolunteerIds.push(volunteerId);

    const volunteer = await fastify.db.volunteerRepository.findOneByOrFail({
      id: volunteerId,
    });
    createdDealIds.push(volunteer.dealId);
    expect(volunteer.personId).toBe(person.id);
    expect(volunteer.infoAbout).toBe("test comment");
  });

  it("400s a second submission once a Volunteer profile already exists", async () => {
    const { token } = await makeRegistrant();

    const body = {
      addressPostcode: "10115",
      locations: [],
      languages: [],
      availability: [],
      activities: [],
      skills: [],
      leadFrom: [],
      goodConductCertificate: "undefined",
      measlesVaccination: "undefined",
      comments: "",
    };

    const first = await fastify.inject({
      method: "POST",
      url: `/volunteer/register?token=${token}`,
      payload: body,
    });
    expect(first.statusCode).toBe(201);
    createdVolunteerIds.push(first.json().data.id);
    const volunteer = await fastify.db.volunteerRepository.findOneByOrFail({
      id: first.json().data.id,
    });
    createdDealIds.push(volunteer.dealId);

    const second = await fastify.inject({
      method: "POST",
      url: `/volunteer/register?token=${token}`,
      payload: body,
    });
    expect(second.statusCode).toBe(400);
  });

  it("400s both submissions of a concurrent double-submit race, only one Volunteer is created", async () => {
    const { person, token } = await makeRegistrant();

    const body = {
      addressPostcode: "10115",
      locations: [],
      languages: [],
      availability: [],
      activities: [],
      skills: [],
      leadFrom: [],
      goodConductCertificate: "undefined",
      measlesVaccination: "undefined",
      comments: "",
    };

    // Both requests race past the findOneBy pre-check before either has
    // committed its INSERT — the volunteer.person_id unique constraint
    // (be#950 migration) must be what actually prevents the duplicate, not
    // the pre-check.
    const [first, second] = await Promise.all([
      fastify.inject({
        method: "POST",
        url: `/volunteer/register?token=${token}`,
        payload: body,
      }),
      fastify.inject({
        method: "POST",
        url: `/volunteer/register?token=${token}`,
        payload: body,
      }),
    ]);

    const statusCodes = [first.statusCode, second.statusCode].sort();
    expect(statusCodes).toEqual([201, 400]);

    const created = first.statusCode === 201 ? first : second;
    createdVolunteerIds.push(created.json().data.id);
    const volunteer = await fastify.db.volunteerRepository.findOneByOrFail({
      id: created.json().data.id,
    });
    createdDealIds.push(volunteer.dealId);

    const count = await fastify.db.volunteerRepository.countBy({
      personId: person.id,
    });
    expect(count).toBe(1);
  });

  it("resolves availability into deal timeslots", async () => {
    const { token } = await makeRegistrant();

    // getTimeslot() only auto-saves a newly-constructed Timeslot on the
    // one-time-event branch of buildDealTimeslots — the recurring branch
    // (which this exercises) relies on the row already existing (real
    // environments seed the finite TimeSlot/OccasionalType set), so
    // pre-create it here rather than depend on that unrelated gap.
    await getRepository(dataSource, Timeslot).save(
      await getTimeslot({
        rrule: getRRULE("Monday"),
        ...getStartEnd("08-11"),
        occasional: null,
      }),
    );

    const res = await fastify.inject({
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

    expect(res.statusCode).toBe(201);
    const volunteerId = res.json().data.id;
    createdVolunteerIds.push(volunteerId);
    const volunteer = await fastify.db.volunteerRepository.findOneOrFail({
      where: { id: volunteerId },
      relations: ["deal", "deal.dealTimeslot"],
    });
    createdDealIds.push(volunteer.dealId);
    expect(volunteer.deal.dealTimeslot.length).toBe(1);
  });

  it("400s an unrecognized availability.day value instead of silently treating it as occasional", async () => {
    const { token } = await makeRegistrant();

    const res = await fastify.inject({
      method: "POST",
      url: `/volunteer/register?token=${token}`,
      payload: {
        addressPostcode: "10115",
        locations: [],
        languages: [],
        availability: [{ day: "monday", daytime: "08-11" }],
        activities: [],
        skills: [],
        leadFrom: [],
        goodConductCertificate: "undefined",
        measlesVaccination: "undefined",
        comments: "",
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

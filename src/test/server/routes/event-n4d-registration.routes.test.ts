import { FastifyInstance } from "fastify";
import {
  ApiEventN4DRegistrationGet,
  EventN4DType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import EventN4DRegistration from "../../../data/entity/event/event-n4d-registration.entity";
import EventN4D from "../../../data/entity/event/event.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";
const DAY = 24 * 60 * 60 * 1000;

describe("sign-ups for need4deed events", () => {
  let fastify: FastifyInstance;
  let coordinatorCookie: string;
  let volunteerCookie: string;
  let upcoming: EventN4D;
  let past: EventN4D;
  let inactive: EventN4D;
  let running: EventN4D;
  let external: EventN4D;
  let asking: EventN4D;
  let volunteer: Volunteer;
  let deal: Deal;
  const suffix = randomNumericSuffix();
  const volunteerEmail = `event-volunteer-${suffix}@test.need4deed.org`;
  const persons: number[] = [];
  const events: number[] = [];

  async function login(role: UserRole) {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Events", lastName: `${role}-${suffix}` }),
    );
    persons.push(person.id);
    const email = `event-${role}-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    const cookie = res.cookies.find(({ name }) => name === accessCookieName);
    if (!cookie) {
      throw new Error("login failed");
    }
    return cookie.value;
  }

  async function makeEvent(
    date: Date,
    isActive = true,
    title?: string,
    extra: Partial<EventN4D> = {},
  ) {
    const de = await fastify.db.languageRepository.findOneByOrFail({
      isoCode: "de",
    });
    const event = await fastify.db.eventRepository.save(
      new EventN4D({
        isActive,
        date,
        type: EventN4DType.PARTY,
        address: "Elsenstraße 87, Berlin",
        languageId: de.id,
        ...extra,
      }),
    );
    events.push(event.id);
    if (title) {
      await getRepository(dataSource, EventTranslation).save(
        new EventTranslation({
          eventn4dId: event.id,
          languageId: de.id,
          title,
          description: "Wir feiern zusammen.",
          shortDescription: "Wir feiern.",
        }),
      );
    }
    return event;
  }

  function signUp(payload: Record<string, unknown>) {
    return fastify.inject({
      method: "POST",
      url: "/event-registration/",
      payload: {
        fullName: "Ali K.",
        email: "ali@example.com",
        numberOfPeople: 1,
        ...payload,
      },
    });
  }

  async function listSignUps(eventId: number, cookie = coordinatorCookie) {
    return fastify.inject({
      method: "GET",
      url: `/event/${eventId}/registrations`,
      cookies: { [accessCookieName]: cookie },
    });
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    coordinatorCookie = await login(UserRole.COORDINATOR);
    volunteerCookie = await login(UserRole.VOLUNTEER);

    upcoming = await makeEvent(
      new Date(Date.now() + 30 * DAY),
      true,
      `Sommerfest ${suffix}`,
    );
    past = await makeEvent(new Date(Date.now() - 30 * DAY));
    inactive = await makeEvent(new Date(Date.now() + 30 * DAY), false);
    running = await makeEvent(new Date(Date.now() - DAY), true, undefined, {
      dateEnd: new Date(Date.now() + DAY),
    });
    external = await makeEvent(
      new Date(Date.now() + 30 * DAY),
      true,
      undefined,
      { rsvpLink: "https://forms.example/rsvp" },
    );
    asking = await makeEvent(new Date(Date.now() + 30 * DAY), true, undefined, {
      signUpQuestion: "Bringst du etwas zum Buffet mit?",
    });

    const person = await fastify.db.personRepository.save(
      new Person({
        firstName: "Mira",
        lastName: `Volunteer-${suffix}`,
        email: volunteerEmail,
      }),
    );
    persons.push(person.id);
    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: person.id }),
    );
  });

  afterAll(async () => {
    await fastify.db.eventRepository.delete(events);
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    for (const personId of persons) {
      await fastify.db.userRepository.delete({ personId });
    }
    await fastify.db.personRepository.delete(persons);
    await fastify.close();
  });

  it("takes a sign-up without a login", async () => {
    const res = await signUp({ eventId: upcoming.id, numberOfPeople: 3 });
    expect(res.statusCode, res.body).toBe(201);
  });

  it("links a volunteer by email, any case, when they say they volunteer", async () => {
    const res = await signUp({
      eventId: upcoming.id,
      email: volunteerEmail.toUpperCase(),
      isVolunteer: true,
      volunteerTypes: [OpportunityType.EVENTS, OpportunityType.REGULAR],
    });
    expect(res.statusCode, res.body).toBe(201);

    const saved = await getRepository(
      dataSource,
      EventN4DRegistration,
    ).findOneByOrFail({
      eventId: upcoming.id,
      email: volunteerEmail.toUpperCase(),
    });
    expect(saved).toMatchObject({
      isVolunteer: true,
      volunteerTypes: [OpportunityType.EVENTS, OpportunityType.REGULAR],
      volunteerId: volunteer.id,
    });
  });

  it("doesn't link anyone who says they don't volunteer", async () => {
    await signUp({ eventId: upcoming.id, email: volunteerEmail });
    const rows = await getRepository(dataSource, EventN4DRegistration).findBy({
      eventId: upcoming.id,
      email: volunteerEmail,
    });
    expect(rows.map(({ volunteerId }) => volunteerId)).toEqual([null]);
  });

  it("refuses a past event, and treats an inactive or missing one as not found", async () => {
    expect((await signUp({ eventId: past.id })).statusCode).toBe(400);
    expect((await signUp({ eventId: inactive.id })).statusCode).toBe(404);
    expect((await signUp({ eventId: 999999999 })).statusCode).toBe(404);
  });

  it("takes sign-ups until a multi-day event ends", async () => {
    const res = await signUp({ eventId: running.id });
    expect(res.statusCode, res.body).toBe(201);
  });

  it("sends sign-ups for an event with its own link there", async () => {
    expect((await signUp({ eventId: external.id })).statusCode).toBe(400);
  });

  it("keeps the answer to the event's question", async () => {
    const email = `asked-${suffix}@test.need4deed.org`;
    const res = await signUp({
      eventId: asking.id,
      email,
      signUpAnswer: " Kuchen ",
    });
    expect(res.statusCode, res.body).toBe(201);
    const saved = await getRepository(
      dataSource,
      EventN4DRegistration,
    ).findOneByOrFail({ eventId: asking.id, email });
    expect(saved.signUpAnswer).toBe("Kuchen");
  });

  it("ignores an answer when the event asks nothing", async () => {
    const email = `unasked-${suffix}@test.need4deed.org`;
    await signUp({ eventId: running.id, email, signUpAnswer: "Kuchen" });
    const saved = await getRepository(
      dataSource,
      EventN4DRegistration,
    ).findOneByOrFail({ eventId: running.id, email });
    expect(saved.signUpAnswer).toBeNull();
  });

  it("exports the answers under the event's question", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/event/${asking.id}/registrations/export`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);
    const [header, row] = res.body.split("\n");
    expect(header).toContain("Bringst du etwas zum Buffet mit?");
    expect(header).not.toContain("Phone");
    expect(row).toContain("Kuchen");
  });

  it("lists sign-ups with the total people for coordinators", async () => {
    const res = await listSignUps(upcoming.id);
    expect(res.statusCode, res.body).toBe(200);
    const { registrations, totalPeople } = res.json().data as {
      registrations: ApiEventN4DRegistrationGet[];
      totalPeople: number;
    };
    expect(registrations).toHaveLength(3);
    expect(totalPeople).toBe(5);
    expect(
      registrations.find(({ volunteerId }) => volunteerId === volunteer.id),
    ).toMatchObject({ isVolunteer: true, attended: false });
  });

  it("keeps the list and export from anyone but staff", async () => {
    expect((await listSignUps(upcoming.id, volunteerCookie)).statusCode).toBe(
      403,
    );
    const exported = await fastify.inject({
      method: "GET",
      url: `/event/${upcoming.id}/registrations/export`,
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(exported.statusCode).toBe(403);
  });

  it("exports the sign-ups as CSV", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/event/${upcoming.id}/registrations/export`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body.split("\n")).toHaveLength(4);
  });

  it("lets a coordinator tick attendance, and shows it on the volunteer's events", async () => {
    const linked = await getRepository(
      dataSource,
      EventN4DRegistration,
    ).findOneByOrFail({ eventId: upcoming.id, volunteerId: volunteer.id });

    const patched = await fastify.inject({
      method: "PATCH",
      url: `/event-registration/${linked.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { attended: true },
    });
    expect(patched.statusCode, patched.body).toBe(200);

    const res = await fastify.inject({
      method: "GET",
      url: `/volunteer/${volunteer.id}/events`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().data).toEqual([
      {
        registrationId: linked.id,
        eventId: upcoming.id,
        title: `Sommerfest ${suffix}`,
        date: upcoming.date.toISOString(),
        attended: true,
      },
    ]);
  });

  it("answers 404 for an unknown volunteer's events", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/volunteer/999999999/events",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("keeps attendance and a volunteer's events from non-staff", async () => {
    const patched = await fastify.inject({
      method: "PATCH",
      url: "/event-registration/1",
      cookies: { [accessCookieName]: volunteerCookie },
      payload: { attended: true },
    });
    expect(patched.statusCode).toBe(403);

    const res = await fastify.inject({
      method: "GET",
      url: `/volunteer/${volunteer.id}/events`,
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(res.statusCode).toBe(403);
  });
});

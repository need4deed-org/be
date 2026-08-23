import { FastifyInstance } from "fastify";
import { EventN4DType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
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

describe("POST /event", () => {
  let fastify: FastifyInstance;

  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let volunteerPerson: Person;
  let volunteerCookie: string;

  const createdEventIds: number[] = [];

  const baseBody = {
    date: "2026-09-01T13:00:00+02:00",
    type: EventN4DType.PARTY,
    linkRSVP: "https://forms.example/rsvp",
    address: "Elsenstraße 87, Berlin",
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const pwHash = await hashPassword(PASSWORD);

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const coordinatorLoginRes = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(
      coordinatorLoginRes.cookies,
      accessCookieName,
    );

    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `volunteer-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
    );
    const volunteerLoginRes = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `volunteer-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    volunteerCookie = getCookie(volunteerLoginRes.cookies, accessCookieName);
  });

  afterAll(async () => {
    const eventTranslationRepository = getRepository(
      dataSource,
      EventTranslation,
    );
    for (const id of createdEventIds) {
      await eventTranslationRepository.delete({ eventn4dId: id });
    }
    await fastify.db.eventRepository.delete(createdEventIds);
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: volunteerPerson.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.close();
  });

  it("creates the base row + one translation row for a single language, defaulting to inactive, echoing back the full detail shape", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        ...baseBody,
        hostName: "Du für Berlin",
        locationLink: "https://maps.example/pin",
        followUpLink: "https://need4deed.org/next-event",
        translations: [
          {
            language: "de",
            title: "Sommerfest",
            menuTitle: "Sommerfest",
            description: "Wir feiern zusammen.",
            shortDescription: "Wir feiern.",
            time: "13:00-18:00",
            outro: "Bis bald!",
            followUpText: "Nächstes Event",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const { data } = res.json();
    createdEventIds.push(data.id);
    expect(data.title).toBe("Sommerfest");
    expect(data.active).toBe(false);
    // Fields ApiEventN4DGetList doesn't carry, only ApiEventN4DGet does —
    // must round-trip through the create response.
    expect(data.hostName).toBe("Du für Berlin");
    expect(data.locationLink).toBe("https://maps.example/pin");
    expect(data.followUpLink).toBe("https://need4deed.org/next-event");
    expect(data.time).toBe("13:00-18:00");
    expect(data.outro).toBe("Bis bald!");
    expect(data.followUpText).toBe("Nächstes Event");

    const translations = await getRepository(dataSource, EventTranslation).find(
      { where: { eventn4dId: data.id } },
    );
    expect(translations).toHaveLength(1);
  });

  it("creates one translation row per submitted language, and respects an explicit active:true", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        ...baseBody,
        active: true,
        translations: [
          {
            language: "de",
            title: "Sommerfest",
            menuTitle: "Sommerfest",
            description: "Wir feiern zusammen.",
            shortDescription: "Wir feiern.",
          },
          {
            language: "en",
            title: "Summer Party",
            menuTitle: "Summer Party",
            description: "We celebrate together.",
            shortDescription: "We celebrate.",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const { data } = res.json();
    createdEventIds.push(data.id);
    expect(data.active).toBe(true);
    // Response echoes back in the first submitted language.
    expect(data.title).toBe("Sommerfest");

    const translations = await getRepository(dataSource, EventTranslation).find(
      { where: { eventn4dId: data.id } },
    );
    expect(translations).toHaveLength(2);
  });

  it("rejects a non-coordinator", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event",
      cookies: { [accessCookieName]: volunteerCookie },
      payload: {
        ...baseBody,
        translations: [
          {
            language: "de",
            title: "Sommerfest",
            menuTitle: "Sommerfest",
            description: "Wir feiern zusammen.",
            shortDescription: "Wir feiern.",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it("requires at least one entry in translations", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { ...baseBody, translations: [] },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects two translations for the same language", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        ...baseBody,
        translations: [
          {
            language: "de",
            title: "Sommerfest",
            menuTitle: "Sommerfest",
            description: "Wir feiern zusammen.",
            shortDescription: "Wir feiern.",
          },
          {
            language: "de",
            title: "Sommerfest 2",
            menuTitle: "Sommerfest 2",
            description: "Nochmal.",
            shortDescription: "Nochmal.",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects dateEnd at or before date", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/event",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        ...baseBody,
        dateEnd: baseBody.date,
        translations: [
          {
            language: "de",
            title: "Sommerfest",
            menuTitle: "Sommerfest",
            description: "Wir feiern zusammen.",
            shortDescription: "Wir feiern.",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

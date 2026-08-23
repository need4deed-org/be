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

describe("PATCH /event/:id", () => {
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

  async function createTestEvent(): Promise<number> {
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
        ],
      },
    });
    const id = res.json().data.id;
    createdEventIds.push(id);
    return id;
  }

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

  it("updates structural fields only, leaving existing translations untouched", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { active: true },
    });

    expect(res.statusCode).toBe(204);

    const event = await fastify.db.eventRepository.findOneByOrFail({ id });
    expect(event.isActive).toBe(true);

    const translations = await getRepository(dataSource, EventTranslation).find(
      { where: { eventn4dId: id } },
    );
    expect(translations).toHaveLength(1);
    expect(translations[0].title).toBe("Sommerfest");
  });

  it("updates an existing language's translation in place", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        translations: [
          {
            language: "de",
            title: "Sommerfest (aktualisiert)",
            menuTitle: "Sommerfest",
            description: "Wir feiern zusammen.",
            shortDescription: "Wir feiern.",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(204);

    const translations = await getRepository(dataSource, EventTranslation).find(
      { where: { eventn4dId: id } },
    );
    expect(translations).toHaveLength(1);
    expect(translations[0].title).toBe("Sommerfest (aktualisiert)");
  });

  it("adds a new language's translation without touching the existing one", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        translations: [
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

    expect(res.statusCode).toBe(204);

    const translations = await getRepository(dataSource, EventTranslation).find(
      { where: { eventn4dId: id } },
    );
    expect(translations).toHaveLength(2);
    const de = translations.find((t) => t.title === "Sommerfest");
    const en = translations.find((t) => t.title === "Summer Party");
    expect(de).toBeDefined();
    expect(en).toBeDefined();
  });

  it("clears a nullable field via explicit null", async () => {
    const id = await createTestEvent();
    await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { pic: "event.webp" },
    });

    const res = await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { pic: null },
    });

    expect(res.statusCode).toBe(204);
    const event = await fastify.db.eventRepository.findOneByOrFail({ id });
    expect(event.pic).toBeNull();
  });

  it("rejects a non-coordinator", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: volunteerCookie },
      payload: { active: true },
    });

    expect(res.statusCode).toBe(403);
  });

  it("404s a nonexistent id", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: "/event/999999999",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { active: true },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects two translations for the same language", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        translations: [
          {
            language: "en",
            title: "One",
            menuTitle: "One",
            description: "One.",
            shortDescription: "One.",
          },
          {
            language: "en",
            title: "Two",
            menuTitle: "Two",
            description: "Two.",
            shortDescription: "Two.",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects a dateEnd that isn't after the (possibly unchanged) date", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "PATCH",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { dateEnd: baseBody.date },
    });

    expect(res.statusCode).toBe(400);
  });
});

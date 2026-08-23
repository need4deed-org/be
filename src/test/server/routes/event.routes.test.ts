import { FastifyInstance } from "fastify";
import { EventN4DType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import EventN4D from "../../../data/entity/event/event.entity";
import Person from "../../../data/entity/person.entity";
import Language from "../../../data/entity/profile/language.entity";
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

describe("GET /event", () => {
  let fastify: FastifyInstance;

  let de: Language;
  let en: Language;
  let activeEvent: EventN4D;
  let inactiveEvent: EventN4D;
  let untranslatedEvent: EventN4D;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let volunteerPerson: Person;
  let volunteerCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const eventTranslationRepository = getRepository(
      dataSource,
      EventTranslation,
    );

    de = await fastify.db.languageRepository.findOneOrFail({
      where: { isoCode: "de" },
    });
    en = await fastify.db.languageRepository.findOneOrFail({
      where: { isoCode: "en" },
    });

    activeEvent = await fastify.db.eventRepository.save(
      new EventN4D({
        isActive: true,
        date: new Date("2026-09-01T13:00:00Z"),
        type: EventN4DType.PARTY,
        address: "Elsenstraße 87, Berlin",
        rsvpLink: "https://forms.example/rsvp",
        languageId: de.id,
      }),
    );
    await eventTranslationRepository.save([
      new EventTranslation({
        eventn4dId: activeEvent.id,
        languageId: de.id,
        title: `Sommerfest ${suffix}`,
        menuTitle: "Sommerfest",
        description: "Wir feiern zusammen.",
        shortDescription: "Wir feiern.",
      }),
      new EventTranslation({
        eventn4dId: activeEvent.id,
        languageId: en.id,
        title: `Summer Party ${suffix}`,
        menuTitle: "Summer Party",
        description: "We celebrate together.",
        shortDescription: "We celebrate.",
      }),
    ]);

    inactiveEvent = await fastify.db.eventRepository.save(
      new EventN4D({
        isActive: false,
        date: new Date("2026-01-01T13:00:00Z"),
        type: EventN4DType.WORKSHOP,
        address: "Elsenstraße 87, Berlin",
        rsvpLink: "https://forms.example/rsvp-old",
        languageId: de.id,
      }),
    );
    await eventTranslationRepository.save(
      new EventTranslation({
        eventn4dId: inactiveEvent.id,
        languageId: de.id,
        title: `Altes Event ${suffix}`,
        menuTitle: "Altes Event",
        description: "Vorbei.",
        shortDescription: "Vorbei.",
      }),
    );

    // An event with zero translations — must be excluded, not crash the feed.
    untranslatedEvent = await fastify.db.eventRepository.save(
      new EventN4D({
        isActive: true,
        date: new Date("2026-10-01T13:00:00Z"),
        type: EventN4DType.PARTY,
        address: "Elsenstraße 87, Berlin",
        rsvpLink: "https://forms.example/rsvp-untranslated",
        languageId: de.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
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
    await eventTranslationRepository.delete({ eventn4dId: activeEvent.id });
    await eventTranslationRepository.delete({ eventn4dId: inactiveEvent.id });
    await fastify.db.eventRepository.delete({ id: activeEvent.id });
    await fastify.db.eventRepository.delete({ id: inactiveEvent.id });
    await fastify.db.eventRepository.delete({ id: untranslatedEvent.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: volunteerPerson.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.close();
  });

  it("responds with the standard {message, data, count} envelope", async () => {
    const res = await fastify.inject({ method: "GET", url: "/event" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.message).toBe("string");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.count).toBe(body.data.length);
  });

  it("shows only active events to an anonymous caller, excluding one with no translations", async () => {
    const res = await fastify.inject({ method: "GET", url: "/event" });
    const ids = res.json().data.map((e: { id: number }) => e.id);
    expect(ids).toContain(activeEvent.id);
    expect(ids).not.toContain(inactiveEvent.id);
    expect(ids).not.toContain(untranslatedEvent.id);
  });

  it("shows only active events to a non-privileged authenticated caller too", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/event",
      cookies: { [accessCookieName]: volunteerCookie },
    });
    const ids = res.json().data.map((e: { id: number }) => e.id);
    expect(ids).not.toContain(inactiveEvent.id);
  });

  it("shows every event, including inactive ones, to a coordinator", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/event",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    const ids = res.json().data.map((e: { id: number }) => e.id);
    expect(ids).toContain(activeEvent.id);
    expect(ids).toContain(inactiveEvent.id);
  });

  it("resolves the German translation by default and the English one when requested", async () => {
    const deRes = await fastify.inject({ method: "GET", url: "/event" });
    const deEvent = deRes
      .json()
      .data.find((e: { id: number }) => e.id === activeEvent.id);
    expect(deEvent.menuTitle).toBe("Sommerfest");

    const enRes = await fastify.inject({
      method: "GET",
      url: "/event?language=en",
    });
    const enEvent = enRes
      .json()
      .data.find((e: { id: number }) => e.id === activeEvent.id);
    expect(enEvent.menuTitle).toBe("Summer Party");
  });

  it("falls back to whatever translation exists when the requested language isn't authored", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/event?language=en",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    const event = res
      .json()
      .data.find((e: { id: number }) => e.id === inactiveEvent.id);
    // Only a German translation exists for this event; requesting English
    // still returns it rather than dropping the event.
    expect(event.menuTitle).toBe("Altes Event");
  });
});

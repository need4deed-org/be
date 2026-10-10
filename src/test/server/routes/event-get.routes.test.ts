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
import { randomNumericSuffix } from "../../random";

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

describe("GET /event/:id", () => {
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

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return getCookie(res.cookies, accessCookieName);
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = randomNumericSuffix();
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
        hostName: "Need4Deed",
        locationLink: "https://maps.example/elsenstrasse",
        followupLink: "https://forms.example/follow-up",
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
        timeStr: "15–18 Uhr",
        outro: "Bis bald!",
        followupText: "Gib uns Feedback.",
      }),
      new EventTranslation({
        eventn4dId: activeEvent.id,
        languageId: en.id,
        title: `Summer Party ${suffix}`,
        menuTitle: "Summer Party",
        description: "We celebrate together.",
        shortDescription: "We celebrate.",
        timeStr: "3–6 pm",
        outro: "See you!",
        followupText: "Give us feedback.",
      }),
    ]);

    inactiveEvent = await fastify.db.eventRepository.save(
      new EventN4D({
        isActive: false,
        date: new Date("2026-01-01T13:00:00Z"),
        type: EventN4DType.WORKSHOP,
        address: "Elsenstraße 87, Berlin",
        rsvpLink: "https://forms.example/rsvp-draft",
        languageId: de.id,
      }),
    );
    await eventTranslationRepository.save(
      new EventTranslation({
        eventn4dId: inactiveEvent.id,
        languageId: de.id,
        title: `Entwurf ${suffix}`,
        menuTitle: "Entwurf",
        description: "Noch nicht veröffentlicht.",
        shortDescription: "Entwurf.",
      }),
    );

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

    const pwHash = await hashPassword(PASSWORD);

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `event-get-coordinator-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    coordinatorCookie = await login(
      `event-get-coordinator-${suffix}@test.need4deed.org`,
    );

    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `event-get-volunteer-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
    );
    volunteerCookie = await login(
      `event-get-volunteer-${suffix}@test.need4deed.org`,
    );
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

  it("returns an active event with its detail fields to an anonymous caller", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/event/${activeEvent.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.message).toBe("string");
    expect(body.data).toMatchObject({
      id: activeEvent.id,
      active: true,
      menuTitle: "Sommerfest",
      hostName: "Need4Deed",
      time: "15–18 Uhr",
      locationLink: "https://maps.example/elsenstrasse",
      followUpText: "Gib uns Feedback.",
      followUpLink: "https://forms.example/follow-up",
      outro: "Bis bald!",
    });
  });

  it("404s on an inactive event for an anonymous caller", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/event/${inactiveEvent.id}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("404s on an inactive event for a non-privileged authenticated caller", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/event/${inactiveEvent.id}`,
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns an inactive event to a coordinator", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/event/${inactiveEvent.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      id: inactiveEvent.id,
      active: false,
      menuTitle: "Entwurf",
    });
  });

  it("404s on a nonexistent id", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/event/2147483647",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("404s on an untranslated event for an anonymous caller but returns it blank to a coordinator", async () => {
    const anonRes = await fastify.inject({
      method: "GET",
      url: `/event/${untranslatedEvent.id}`,
    });
    expect(anonRes.statusCode).toBe(404);

    const coordinatorRes = await fastify.inject({
      method: "GET",
      url: `/event/${untranslatedEvent.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(coordinatorRes.statusCode).toBe(200);
    expect(coordinatorRes.json().data.title).toBe("");
  });

  it("resolves the German translation by default and the English one when requested", async () => {
    const deRes = await fastify.inject({
      method: "GET",
      url: `/event/${activeEvent.id}`,
    });
    expect(deRes.json().data.menuTitle).toBe("Sommerfest");

    const enRes = await fastify.inject({
      method: "GET",
      url: `/event/${activeEvent.id}?language=en`,
    });
    expect(enRes.json().data).toMatchObject({
      menuTitle: "Summer Party",
      time: "3–6 pm",
      outro: "See you!",
    });
  });

  it("falls back to whatever translation exists when the requested language isn't authored", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/event/${inactiveEvent.id}?language=en`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.json().data.menuTitle).toBe("Entwurf");
  });

  it("does not grant privileged access from a validly-signed non-access token", async () => {
    const verifyToken = fastify.jwt.sign({
      id: (
        await fastify.db.userRepository.findOneByOrFail({
          personId: coordinatorPerson.id,
        })
      ).id,
      email: "irrelevant@test.need4deed.org",
      type: "verify",
    });

    const res = await fastify.inject({
      method: "GET",
      url: `/event/${inactiveEvent.id}`,
      cookies: { [accessCookieName]: verifyToken },
    });
    expect(res.statusCode).toBe(404);
  });
});

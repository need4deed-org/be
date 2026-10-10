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
  let ongoingEvent: EventN4D;
  let suffix: string;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let volunteerPerson: Person;
  let volunteerCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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

    // Started yesterday, ends in a month — always "in progress" whenever the
    // suite runs, so it exercises the dateEnd-aware `from` bound.
    const day = 24 * 60 * 60 * 1000;
    ongoingEvent = await fastify.db.eventRepository.save(
      new EventN4D({
        isActive: true,
        date: new Date(Date.now() - day),
        dateEnd: new Date(Date.now() + 30 * day),
        type: EventN4DType.WORKSHOP,
        address: `Street-${suffix} 1, Berlin`,
        hostName: `Host-${suffix}`,
        rsvpLink: "https://forms.example/rsvp-ongoing",
        languageId: de.id,
      }),
    );
    await eventTranslationRepository.save(
      new EventTranslation({
        eventn4dId: ongoingEvent.id,
        languageId: de.id,
        title: "Laufende Ausstellung",
        menuTitle: "Ausstellung",
        description: "Läuft noch.",
        shortDescription: "Läuft noch.",
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
    await eventTranslationRepository.delete({ eventn4dId: ongoingEvent.id });
    await fastify.db.eventRepository.delete({ id: activeEvent.id });
    await fastify.db.eventRepository.delete({ id: inactiveEvent.id });
    await fastify.db.eventRepository.delete({ id: untranslatedEvent.id });
    await fastify.db.eventRepository.delete({ id: ongoingEvent.id });
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

  it("shows every event, including inactive and untranslated ones, to a coordinator", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/event",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    const data = res.json().data;
    const ids = data.map((e: { id: number }) => e.id);
    expect(ids).toContain(activeEvent.id);
    expect(ids).toContain(inactiveEvent.id);
    // A coordinator must still see an untranslated event to translate it —
    // it just renders with blank text instead of disappearing.
    expect(ids).toContain(untranslatedEvent.id);
    const untranslated = data.find(
      (e: { id: number }) => e.id === untranslatedEvent.id,
    );
    expect(untranslated.title).toBe("");
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

  it("does not grant privileged access from a validly-signed non-access token (e.g. an email-verification token)", async () => {
    // Mirrors sendEmailVerification's payload shape exactly — same secret,
    // same coordinator id, but type: "verify" instead of "access", and (like
    // the real verify token) no expiry at all.
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
      url: "/event",
      cookies: { [accessCookieName]: verifyToken },
    });

    const ids = res.json().data.map((e: { id: number }) => e.id);
    expect(ids).not.toContain(inactiveEvent.id);
  });

  describe("search", () => {
    async function searchIds(query: string, cookie?: string) {
      const res = await fastify.inject({
        method: "GET",
        url: `/event?${query}`,
        ...(cookie && { cookies: { [accessCookieName]: cookie } }),
      });
      expect(res.statusCode).toBe(200);
      return res.json().data.map((e: { id: number }) => e.id);
    }

    it("matches the active translation's title, case-insensitively", async () => {
      const ids = await searchIds(
        `language=en&search=${encodeURIComponent(`SUMMER party ${suffix}`)}`,
      );
      expect(ids).toEqual([activeEvent.id]);
    });

    it("does not match a translation other than the one being shown", async () => {
      const ids = await searchIds(
        `language=en&search=${encodeURIComponent(`Sommerfest ${suffix}`)}`,
      );
      expect(ids).not.toContain(activeEvent.id);
    });

    it("matches the active translation's description", async () => {
      const ids = await searchIds(
        `language=en&search=${encodeURIComponent("celebrate together")}`,
      );
      expect(ids).toContain(activeEvent.id);
    });

    it("matches hostName and address", async () => {
      expect(await searchIds(`search=Host-${suffix}`)).toEqual([
        ongoingEvent.id,
      ]);
      expect(await searchIds(`search=street-${suffix}`)).toEqual([
        ongoingEvent.id,
      ]);
    });

    it("returns an empty list when nothing matches", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: `/event?search=nomatch-${suffix}`,
      });
      expect(res.json()).toMatchObject({ data: [], count: 0 });
    });

    it("still applies the active-only visibility filter", async () => {
      const query = `search=${encodeURIComponent(`Altes Event ${suffix}`)}`;
      expect(await searchIds(query)).toEqual([]);
      expect(await searchIds(query, coordinatorCookie)).toEqual([
        inactiveEvent.id,
      ]);
    });
  });

  describe("from / to", () => {
    async function rangeIds(query: string, cookie = coordinatorCookie) {
      const res = await fastify.inject({
        method: "GET",
        url: `/event?${query}`,
        cookies: { [accessCookieName]: cookie },
      });
      expect(res.statusCode).toBe(200);
      return res.json().data.map((e: { id: number }) => e.id);
    }

    it("is unbounded on both ends when neither is given", async () => {
      const ids = await rangeIds("");
      expect(ids).toEqual(
        expect.arrayContaining([
          inactiveEvent.id,
          activeEvent.id,
          untranslatedEvent.id,
          ongoingEvent.id,
        ]),
      );
    });

    it("applies only a lower bound when just `from` is given", async () => {
      const ids = await rangeIds("from=2026-06-01");
      expect(ids).toContain(activeEvent.id);
      expect(ids).not.toContain(inactiveEvent.id);
    });

    it("applies only an upper bound when just `to` is given", async () => {
      const ids = await rangeIds("to=2026-06-01");
      expect(ids).toContain(inactiveEvent.id);
      expect(ids).not.toContain(activeEvent.id);
    });

    it("applies both bounds, with `to` covering its whole day", async () => {
      const ids = await rangeIds("from=2026-08-01&to=2026-09-01");
      expect(ids).toContain(activeEvent.id);
      expect(ids).not.toContain(inactiveEvent.id);
      expect(ids).not.toContain(untranslatedEvent.id);
    });

    it("resolves from=true to now, keeping events still in progress", async () => {
      const ids = await rangeIds("from=true");
      expect(ids).toContain(ongoingEvent.id);
      expect(ids).not.toContain(activeEvent.id);
      expect(ids).not.toContain(inactiveEvent.id);
    });

    it("still applies the active-only visibility filter", async () => {
      const ids = await rangeIds("to=2026-06-01", volunteerCookie);
      expect(ids).not.toContain(inactiveEvent.id);
    });

    it("rejects a malformed date with 400", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: "/event?from=yesterday",
      });
      expect(res.statusCode).toBe(400);
    });
  });
});

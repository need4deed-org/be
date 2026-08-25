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

describe("DELETE /event/:id", () => {
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
    if (res.statusCode !== 201) {
      throw new Error(
        `createTestEvent fixture setup failed: ${res.statusCode} ${res.body}`,
      );
    }
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
    // No separate EventTranslation cleanup needed — the FK's ON DELETE
    // CASCADE handles it, and delete() on an already-gone id (events the
    // tests themselves deleted) is a harmless no-op.
    await fastify.db.eventRepository.delete(createdEventIds);
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: volunteerPerson.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.close();
  });

  it("deletes the event row and cascades to its translations", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "DELETE",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(200);

    const event = await fastify.db.eventRepository.findOneBy({ id });
    expect(event).toBeNull();

    const translations = await getRepository(dataSource, EventTranslation).find(
      { where: { eventn4dId: id } },
    );
    expect(translations).toHaveLength(0);
  });

  it("rejects a non-coordinator", async () => {
    const id = await createTestEvent();

    const res = await fastify.inject({
      method: "DELETE",
      url: `/event/${id}`,
      cookies: { [accessCookieName]: volunteerCookie },
    });

    expect(res.statusCode).toBe(403);

    const event = await fastify.db.eventRepository.findOneBy({ id });
    expect(event).not.toBeNull();
  });

  it("404s a nonexistent id", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: "/event/999999999",
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(404);
  });
});

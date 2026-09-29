import type { FastifyInstance } from "fastify";
import { EntityTableName, UserRole } from "need4deed-sdk";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { dataSource } from "../../../../data/data-source";
import Person from "../../../../data/entity/person.entity";
import User from "../../../../data/entity/user.entity";
import { notifyTaggedByEmail } from "../../../../server/utils/data/notify-tagged-by-email";
import { randomNumericSuffix } from "../../../random";

describe("notifyTaggedByEmail (be#1075)", () => {
  const suffix = randomNumericSuffix();
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];
  const emailTagged = vi.fn();
  const fastify = { notify: { emailTagged } } as unknown as FastifyInstance;
  const where = {
    kind: "comment",
    entityType: EntityTableName.VOLUNTEER,
    entityId: 1,
  } as const;

  let coordinator: Person;
  let agent: Person;
  let inactive: Person;
  let deactivated: Person;
  let author: Person;
  let authorUser: User;
  let noUser: Person;

  async function makePerson(
    tag: string,
    user?: Partial<User>,
  ): Promise<{ person: Person; user?: User }> {
    const person = await dataSource
      .getRepository(Person)
      .save(new Person({ firstName: tag, lastName: `Tagged${suffix}` }));
    createdPersonIds.push(person.id);
    if (!user) {
      return { person };
    }
    const saved = await dataSource.getRepository(User).save(
      new User({
        email: `${tag.toLowerCase()}-${suffix}@example.com`,
        password: "x",
        role: UserRole.COORDINATOR,
        isActive: true,
        language: "de",
        personId: person.id,
        ...user,
      }),
    );
    createdUserIds.push(saved.id);
    return { person, user: saved };
  }

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    coordinator = (await makePerson("Cora", {})).person;
    agent = (await makePerson("Aga", { role: UserRole.AGENT })).person;
    inactive = (await makePerson("Ina", { isActive: false })).person;
    deactivated = (
      await makePerson("Dea", { isActive: true, deactivatedAt: new Date() })
    ).person;
    const a = await makePerson("Auth", {});
    author = a.person;
    authorUser = a.user!;
    noUser = (await makePerson("Nou")).person;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await dataSource.getRepository(User).delete({ id });
    }
    for (const id of createdPersonIds) {
      await dataSource.getRepository(Person).delete({ id });
    }
    await dataSource.destroy();
  });

  beforeEach(() => {
    emailTagged.mockReset();
    emailTagged.mockResolvedValue(undefined);
  });

  const recipients = () =>
    emailTagged.mock.calls.map(([input]) => input.recipient.email).sort();

  it("emails only active users of tagged persons in the allowed roles, never the author", async () => {
    await notifyTaggedByEmail(fastify, {
      personIds: [
        coordinator.id,
        agent.id,
        inactive.id,
        deactivated.id,
        noUser.id,
        author.id,
      ],
      author: { userId: authorUser.id, personId: author.id, name: "Auth" },
      allowedRoles: [UserRole.COORDINATOR, UserRole.ADMIN],
      text: "hello",
      where,
    });

    expect(recipients()).toEqual([`cora-${suffix}@example.com`]);
    expect(emailTagged.mock.calls[0][0]).toEqual({
      recipient: {
        email: `cora-${suffix}@example.com`,
        name: `Cora Tagged${suffix}`,
        language: "de",
      },
      authorName: "Auth",
      text: "hello",
      where,
    });
  });

  it("includes AGENT users when the role is allowed (posts)", async () => {
    await notifyTaggedByEmail(fastify, {
      personIds: [coordinator.id, agent.id],
      author: { userId: authorUser.id, personId: author.id },
      allowedRoles: [UserRole.AGENT, UserRole.COORDINATOR, UserRole.ADMIN],
      text: "hello",
      where: { kind: "post" },
    });

    expect(recipients()).toEqual([
      `aga-${suffix}@example.com`,
      `cora-${suffix}@example.com`,
    ]);
  });

  it("skips the author by user id even when they have no person", async () => {
    await notifyTaggedByEmail(fastify, {
      personIds: [author.id, author.id],
      author: { userId: authorUser.id, personId: null },
      allowedRoles: [UserRole.COORDINATOR],
      text: "hello",
      where,
    });

    expect(emailTagged).not.toHaveBeenCalled();
  });

  it("emails a person once even when tagged twice", async () => {
    await notifyTaggedByEmail(fastify, {
      personIds: [coordinator.id, coordinator.id],
      author: { userId: authorUser.id, personId: author.id },
      allowedRoles: [UserRole.COORDINATOR],
      text: "hello",
      where,
    });

    expect(emailTagged).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["rejects", () => emailTagged.mockRejectedValue(new Error("SMTP down"))],
    [
      "throws",
      () =>
        emailTagged.mockImplementation(() => {
          throw new Error("boom");
        }),
    ],
  ])("never rejects when a send %s", async (_, arrange) => {
    arrange();

    await expect(
      notifyTaggedByEmail(fastify, {
        personIds: [coordinator.id],
        author: { userId: authorUser.id, personId: author.id },
        allowedRoles: [UserRole.COORDINATOR],
        text: "hello",
        where,
      }),
    ).resolves.toBeUndefined();
    expect(emailTagged).toHaveBeenCalledTimes(1);
  });
});

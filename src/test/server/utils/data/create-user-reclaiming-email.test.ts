import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Person from "../../../../data/entity/person.entity";
import User from "../../../../data/entity/user.entity";
import { hashPassword } from "../../../../data/utils";
import { createServer } from "../../../../server";
import { createUserReclaimingEmail } from "../../../../server/utils/data/assert-email-available";

describe("createUserReclaimingEmail", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const emails: string[] = [];

  async function makePendingUser(email: string) {
    emails.push(email);
    return fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword("squatter_password"),
        role: UserRole.VOLUNTEER,
        isActive: false,
        person: new Person({ firstName: "Pending", lastName: "User", email }),
      }),
    );
  }

  async function expectPendingUserKept(pendingUser: User) {
    const users = await fastify.db.userRepository.findBy({
      email: pendingUser.email,
    });
    expect(users.map((u) => u.id)).toEqual([pendingUser.id]);
    expect(
      await fastify.db.personRepository.countBy({ id: pendingUser.personId }),
    ).toBe(1);
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    for (const email of emails) {
      await fastify.db.userRepository.delete({ email });
      await fastify.db.personRepository.delete({ email });
    }
    await fastify.close();
  });

  it("keeps the pending User when building the new one throws", async () => {
    const pendingUser = await makePendingUser(
      `reclaim-throws-${suffix}@example.com`,
    );

    await expect(
      createUserReclaimingEmail(
        fastify.db.userRepository.manager,
        pendingUser.email,
        async () => {
          throw new Error("boom");
        },
      ),
    ).rejects.toThrow("boom");

    await expectPendingUserKept(pendingUser);
  });

  it("keeps the pending User when the new one fails validation", async () => {
    const pendingUser = await makePendingUser(
      `reclaim-invalid-${suffix}@example.com`,
    );

    const result = await createUserReclaimingEmail(
      fastify.db.userRepository.manager,
      pendingUser.email,
      async () =>
        new User({
          email: pendingUser.email,
          password: "x",
          role: "bogus" as UserRole,
        }),
    );

    expect(result.status).toBe("error");
    await expectPendingUserKept(pendingUser);
  });
});

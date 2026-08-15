import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { createApiKey, parseArgs } from "../../../data/scripts/create-api-key";
import { createServer } from "../../../server";

describe("create-api-key parseArgs", () => {
  it("requires --label and --role", () => {
    expect(() => parseArgs([])).toThrow(/Usage/);
    expect(() => parseArgs(["--label", "bot"])).toThrow(/Usage/);
  });

  it("rejects a role outside admin/coordinator/agent", () => {
    expect(() => parseArgs(["--label", "bot", "--role", "volunteer"])).toThrow(
      /Usage/,
    );
  });

  it("accepts --role case-insensitively", () => {
    expect(parseArgs(["--label", "bot", "--role", "Coordinator"])).toEqual({
      label: "bot",
      role: UserRole.COORDINATOR,
    });
  });

  it("requires --agent-id for --role agent", () => {
    expect(() => parseArgs(["--label", "bot", "--role", "agent"])).toThrow(
      /--agent-id is required/,
    );
  });

  it("rejects a non-integer --agent-id", () => {
    expect(() =>
      parseArgs(["--label", "bot", "--role", "agent", "--agent-id", "abc"]),
    ).toThrow(/positive integer/);
    expect(() =>
      parseArgs(["--label", "bot", "--role", "agent", "--agent-id", "0"]),
    ).toThrow(/positive integer/);
  });

  it("parses a valid agent mint", () => {
    expect(
      parseArgs(["--label", "bot", "--role", "agent", "--agent-id", "7"]),
    ).toEqual({ label: "bot", role: UserRole.AGENT, agentId: 7 });
  });
});

describe("createApiKey", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  const labelsToClean: string[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `create-api-key test agent ${Date.now()}` }),
    );
  });

  afterAll(async () => {
    for (const label of labelsToClean) {
      const key = await fastify.db.apiKeyRepository.findOne({
        where: { label },
      });
      if (!key) {
        continue;
      }
      const user = await fastify.db.userRepository.findOne({
        where: { id: key.userId },
      });
      await fastify.db.apiKeyRepository.delete({ id: key.id });
      if (user?.personId) {
        await fastify.db.agentPersonRepository.delete({
          personId: user.personId,
        });
      }
      await fastify.db.userRepository.delete({ id: key.userId });
      if (user?.personId) {
        await fastify.db.personRepository.delete({ id: user.personId });
      }
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("mints an admin key with no attached Person", async () => {
    const label = `test-admin-${Date.now()}`;
    labelsToClean.push(label);

    const { rawKey, userId } = await createApiKey(dataSource, {
      label,
      role: UserRole.ADMIN,
    });

    expect(rawKey).toMatch(/^n4d_[0-9a-f]{64}$/);

    const user = await fastify.db.userRepository.findOneByOrFail({
      id: userId,
    });
    expect(user.role).toBe(UserRole.ADMIN);
    expect(user.personId).toBeFalsy();

    const apiKey = await fastify.db.apiKeyRepository.findOneByOrFail({
      label,
    });
    expect(apiKey.keyHash).not.toBe(rawKey);
    expect(apiKey.userId).toBe(userId);
  });

  it("mints an agent key with a Person and an active AgentPerson membership", async () => {
    const label = `test-agent-${Date.now()}`;
    labelsToClean.push(label);

    const { userId, agentTitle } = await createApiKey(dataSource, {
      label,
      role: UserRole.AGENT,
      agentId: agent.id,
    });

    expect(agentTitle).toBe(agent.title);

    const user = await fastify.db.userRepository.findOneByOrFail({
      id: userId,
    });
    expect(user.role).toBe(UserRole.AGENT);
    expect(user.personId).toBeTruthy();

    const membership = await fastify.db.agentPersonRepository.findOneByOrFail({
      agentId: agent.id,
      personId: user.personId,
    });
    expect(membership.status).toBe(AgentMembershipStatus.ACTIVE);
    expect(membership.role).toBe(AgentRoleType.OTHER);
  });

  it("rejects a nonexistent --agent-id and leaves no orphaned User", async () => {
    const label = `test-bad-agent-${Date.now()}`;

    await expect(
      createApiKey(dataSource, {
        label,
        role: UserRole.AGENT,
        agentId: 999999999,
      }),
    ).rejects.toThrow(/not found/);

    const orphan = await fastify.db.userRepository.findOne({
      where: { email: `api-key+${label}@bots.need4deed.org` },
    });
    expect(orphan).toBeNull();
  });

  it("rejects a duplicate label without creating a second User", async () => {
    const label = `test-dup-${Date.now()}`;
    labelsToClean.push(label);

    await createApiKey(dataSource, { label, role: UserRole.COORDINATOR });

    await expect(
      createApiKey(dataSource, { label, role: UserRole.COORDINATOR }),
    ).rejects.toThrow(/already exists/);

    const count = await fastify.db.userRepository.count({
      where: { email: `api-key+${label}@bots.need4deed.org` },
    });
    expect(count).toBe(1);
  });
});

import { AgentMembershipStatus, AgentRoleType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AgentLanguage from "../../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Agent from "../../../../data/entity/opportunity/agent.entity";
import {
  classifyRegisterAgentConflict,
  createAgentForPerson,
  joinAgent,
  resolveJoinStatus,
} from "../../../../server/utils/data/write-agent-registration";

const createAddressMock = vi.fn();
vi.mock("../../../../server/utils/data/for-routes", () => ({
  createAddress: (...args: unknown[]) => createAddressMock(...args),
}));

const txnManager: any = { getRepository: vi.fn() };
const agentPersonRepoFindOne = vi.fn();
const agentPersonRepoSave = vi.fn();

vi.mock("../../../../data/data-source", () => ({
  dataSource: {
    manager: { transaction: async (cb: any) => cb(txnManager) },
    getRepository: () => ({
      findOne: agentPersonRepoFindOne,
      save: agentPersonRepoSave,
    }),
  },
}));

const agentSave = vi.fn();
const agentPersonSave = vi.fn();
const agentLanguageSave = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();

  txnManager.getRepository.mockImplementation((entity: any) => {
    switch (entity) {
      case Agent:
        return { save: agentSave };
      case AgentPerson:
        return { save: agentPersonSave };
      case AgentLanguage:
        return { save: agentLanguageSave };
      default:
        throw new Error(`unexpected repo: ${entity?.name}`);
    }
  });

  agentSave.mockImplementation(async (a: any) => ({ ...a, id: 33 }));
  agentPersonSave.mockImplementation(async (ap: any) => ({ ...ap, id: 44 }));
  agentLanguageSave.mockImplementation(async (rows: any[]) => rows);
});

describe("createAgentForPerson", () => {
  it("persists Agent + ACTIVE AgentPerson in one transaction and returns the id", async () => {
    const result = await createAgentForPerson(11, { title: "Centre HERO" });

    expect(agentSave).toHaveBeenCalledTimes(1);
    expect(agentSave.mock.calls[0][0]).toMatchObject({
      title: "Centre HERO",
      addressId: undefined,
    });

    expect(agentPersonSave).toHaveBeenCalledTimes(1);
    expect(agentPersonSave.mock.calls[0][0]).toMatchObject({
      agentId: 33,
      personId: 11,
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
      status: AgentMembershipStatus.ACTIVE,
    });

    expect(agentLanguageSave).not.toHaveBeenCalled();
    expect(createAddressMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      agentId: 33,
      membershipStatus: AgentMembershipStatus.ACTIVE,
    });
  });

  it("creates Address and propagates addressId to Agent when street+postcode given", async () => {
    createAddressMock.mockResolvedValueOnce({ id: 99 });

    await createAgentForPerson(11, {
      title: "Centre HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
    });

    expect(createAddressMock).toHaveBeenCalledWith(
      { street: "Bitterfelder Str 11" },
      { value: "12681" },
      txnManager,
    );
    expect(agentSave.mock.calls[0][0].addressId).toBe(99);
  });

  it("skips Address when only street or only postcode is given", async () => {
    await createAgentForPerson(11, {
      title: "Centre HERO",
      addressStreet: "Solo Street",
    });

    expect(createAddressMock).not.toHaveBeenCalled();
    expect(agentSave.mock.calls[0][0].addressId).toBeUndefined();
  });

  it("falls through cleanly when createAddress returns null (postcode unresolved)", async () => {
    createAddressMock.mockResolvedValueOnce(null);

    const result = await createAgentForPerson(11, {
      title: "Centre HERO",
      addressStreet: "Some Street",
      addressPostcode: "99999",
    });

    expect(agentSave.mock.calls[0][0].addressId).toBeUndefined();
    expect(result.agentId).toBe(33);
  });

  it("inserts AgentLanguage rows for each selected language id", async () => {
    await createAgentForPerson(11, {
      title: "Centre HERO",
      languages: [5, 7, 9],
    });

    expect(agentLanguageSave).toHaveBeenCalledTimes(1);
    expect(agentLanguageSave.mock.calls[0][0]).toEqual([
      { agentId: 33, languageId: 5 },
      { agentId: 33, languageId: 7 },
      { agentId: 33, languageId: 9 },
    ]);
  });
});

describe("resolveJoinStatus", () => {
  it("returns ACTIVE when an existing member shares the registrant's email domain", async () => {
    agentPersonRepoFindOne.mockResolvedValueOnce({ id: 1 });
    const status = await resolveJoinStatus(33, "newcomer@center.de");
    expect(status).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("returns PENDING when no existing member shares the domain", async () => {
    agentPersonRepoFindOne.mockResolvedValueOnce(null);
    const status = await resolveJoinStatus(33, "stranger@elsewhere.de");
    expect(status).toBe(AgentMembershipStatus.PENDING);
  });

  it("returns PENDING for a malformed email with no domain", async () => {
    const status = await resolveJoinStatus(33, "no-at-sign");
    // "no-at-sign".split("@").pop() === "no-at-sign", so it still queries;
    // ensure a non-match resolves PENDING.
    agentPersonRepoFindOne.mockResolvedValueOnce(null);
    expect(status === AgentMembershipStatus.PENDING).toBe(true);
  });
});

describe("joinAgent", () => {
  it("creates a new membership link with the given status when none exists", async () => {
    agentPersonRepoFindOne.mockResolvedValueOnce(null);

    const result = await joinAgent(11, 33, AgentMembershipStatus.PENDING);

    expect(agentPersonRepoSave).toHaveBeenCalledTimes(1);
    expect(agentPersonRepoSave.mock.calls[0][0]).toMatchObject({
      agentId: 33,
      personId: 11,
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
      status: AgentMembershipStatus.PENDING,
    });
    expect(result).toEqual({
      agentId: 33,
      membershipStatus: AgentMembershipStatus.PENDING,
    });
  });

  it("is idempotent: returns the existing membership status without saving again", async () => {
    agentPersonRepoFindOne.mockResolvedValueOnce({
      id: 7,
      status: AgentMembershipStatus.ACTIVE,
    });

    const result = await joinAgent(11, 33, AgentMembershipStatus.PENDING);

    expect(agentPersonRepoSave).not.toHaveBeenCalled();
    expect(result).toEqual({
      agentId: 33,
      membershipStatus: AgentMembershipStatus.ACTIVE,
    });
  });
});

describe("classifyRegisterAgentConflict", () => {
  it("returns 'title' for a 23505 violation on the title column", () => {
    expect(
      classifyRegisterAgentConflict({
        code: "23505",
        detail: "Key (title)=(Centre HERO) already exists.",
      }),
    ).toBe("title");
  });

  it("returns null for non-unique-violation errors", () => {
    expect(
      classifyRegisterAgentConflict({ code: "23502", detail: "anything" }),
    ).toBeNull();
    expect(classifyRegisterAgentConflict(new Error("kaboom"))).toBeNull();
    expect(classifyRegisterAgentConflict(null)).toBeNull();
  });

  it("returns null for 23505 on an unknown column", () => {
    expect(
      classifyRegisterAgentConflict({
        code: "23505",
        detail: "Key (something_else)=(...) already exists.",
      }),
    ).toBeNull();
  });
});

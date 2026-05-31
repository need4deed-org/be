import { AgentRoleType, UserRole } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AgentLanguage from "../../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Agent from "../../../../data/entity/opportunity/agent.entity";
import Person from "../../../../data/entity/person.entity";
import User from "../../../../data/entity/user.entity";
import {
  classifyRegisterAgentConflict,
  writeAgentRegistration,
} from "../../../../server/utils/data/write-agent-registration";

vi.mock("../../../../data/utils", async () => {
  const actual = await vi.importActual<typeof import("../../../../data/utils")>(
    "../../../../data/utils",
  );
  return { ...actual, hashPassword: vi.fn(async () => "HASHED") };
});

const createAddressMock = vi.fn();
vi.mock("../../../../server/utils/data/for-routes", () => ({
  createAddress: (...args: unknown[]) => createAddressMock(...args),
}));

const txnManager: any = { getRepository: vi.fn() };
vi.mock("../../../../data/data-source", () => ({
  dataSource: {
    manager: { transaction: async (cb: any) => cb(txnManager) },
  },
}));

const personSave = vi.fn();
const userSave = vi.fn();
const agentSave = vi.fn();
const agentPersonSave = vi.fn();
const agentLanguageSave = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();

  txnManager.getRepository.mockImplementation((entity: any) => {
    switch (entity) {
      case Person:
        return { save: personSave };
      case User:
        return { save: userSave };
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

  personSave.mockImplementation(async (p: any) => ({ ...p, id: 11 }));
  userSave.mockImplementation(async (u: any) => ({ ...u, id: 22 }));
  agentSave.mockImplementation(async (a: any) => ({ ...a, id: 33 }));
  agentPersonSave.mockImplementation(async (ap: any) => ({ ...ap, id: 44 }));
  agentLanguageSave.mockImplementation(async (rows: any[]) => rows);
});

const baseInput = {
  email: "owner@center.de",
  password: "supersecret",
  person: { firstName: "Owner", lastName: "Surname", phone: "+49301111" },
  agent: { title: "Centre HERO" },
};

describe("writeAgentRegistration", () => {
  it("persists Person, User, Agent, AgentPerson in one transaction and returns the ids", async () => {
    const result = await writeAgentRegistration(baseInput);

    expect(personSave).toHaveBeenCalledTimes(1);
    expect(personSave.mock.calls[0][0]).toMatchObject({
      firstName: "Owner",
      lastName: "Surname",
      email: "owner@center.de",
      phone: "+49301111",
      addressId: undefined,
    });

    expect(userSave).toHaveBeenCalledTimes(1);
    expect(userSave.mock.calls[0][0]).toMatchObject({
      email: "owner@center.de",
      password: "HASHED",
      role: UserRole.AGENT,
      isActive: false,
      personId: 11,
    });

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
    });

    expect(agentLanguageSave).not.toHaveBeenCalled();
    expect(createAddressMock).not.toHaveBeenCalled();

    expect(result).toEqual({ userId: 22, agentId: 33, personId: 11 });
  });

  it("creates Address and propagates addressId to Person and Agent when street+postcode given", async () => {
    createAddressMock.mockResolvedValueOnce({ id: 99 });

    await writeAgentRegistration({
      ...baseInput,
      agent: {
        ...baseInput.agent,
        addressStreet: "Bitterfelder Str 11",
        addressPostcode: "12681",
      },
    });

    expect(createAddressMock).toHaveBeenCalledTimes(1);
    expect(createAddressMock).toHaveBeenCalledWith(
      { street: "Bitterfelder Str 11" },
      { value: "12681" },
      txnManager,
    );
    expect(personSave.mock.calls[0][0].addressId).toBe(99);
    expect(agentSave.mock.calls[0][0].addressId).toBe(99);
  });

  it("skips Address when only street or only postcode is given", async () => {
    await writeAgentRegistration({
      ...baseInput,
      agent: { ...baseInput.agent, addressStreet: "Solo Street" },
    });

    expect(createAddressMock).not.toHaveBeenCalled();
    expect(personSave.mock.calls[0][0].addressId).toBeUndefined();
    expect(agentSave.mock.calls[0][0].addressId).toBeUndefined();
  });

  it("falls through cleanly when createAddress returns null (postcode unresolved)", async () => {
    createAddressMock.mockResolvedValueOnce(null);

    const result = await writeAgentRegistration({
      ...baseInput,
      agent: {
        ...baseInput.agent,
        addressStreet: "Some Street",
        addressPostcode: "99999",
      },
    });

    expect(personSave.mock.calls[0][0].addressId).toBeUndefined();
    expect(agentSave.mock.calls[0][0].addressId).toBeUndefined();
    expect(result.userId).toBe(22);
  });

  it("inserts AgentLanguage rows for each selected language id", async () => {
    await writeAgentRegistration({
      ...baseInput,
      agent: { ...baseInput.agent, languages: [5, 7, 9] },
    });

    expect(agentLanguageSave).toHaveBeenCalledTimes(1);
    expect(agentLanguageSave.mock.calls[0][0]).toEqual([
      { agentId: 33, languageId: 5 },
      { agentId: 33, languageId: 7 },
      { agentId: 33, languageId: 9 },
    ]);
  });

  it("uses provided language/timezone, falling back to en/CET when absent", async () => {
    await writeAgentRegistration({
      ...baseInput,
      language: "de",
      timezone: "Europe/Berlin",
    });
    expect(userSave.mock.calls[0][0]).toMatchObject({
      language: "de",
      timezone: "Europe/Berlin",
    });

    vi.clearAllMocks();
    personSave.mockImplementation(async (p: any) => ({ ...p, id: 11 }));
    userSave.mockImplementation(async (u: any) => ({ ...u, id: 22 }));
    agentSave.mockImplementation(async (a: any) => ({ ...a, id: 33 }));
    agentPersonSave.mockImplementation(async (ap: any) => ({ ...ap, id: 44 }));
    txnManager.getRepository.mockImplementation((entity: any) => {
      switch (entity) {
        case Person:
          return { save: personSave };
        case User:
          return { save: userSave };
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

    await writeAgentRegistration(baseInput);
    expect(userSave.mock.calls[0][0]).toMatchObject({
      language: "en",
      timezone: "CET",
    });
  });
});

describe("classifyRegisterAgentConflict", () => {
  it("returns 'email' for a 23505 violation on the email column", () => {
    expect(
      classifyRegisterAgentConflict({
        code: "23505",
        detail: "Key (email)=(x@y.de) already exists.",
      }),
    ).toBe("email");
  });

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

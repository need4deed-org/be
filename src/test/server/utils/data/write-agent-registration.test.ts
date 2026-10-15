import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  ApiAgentRegisterNew,
} from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../../config";
import AgentLanguage from "../../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import AgentService from "../../../../data/entity/m2m/agent-service";
import Agent from "../../../../data/entity/opportunity/agent.entity";
import Person from "../../../../data/entity/person.entity";
import {
  AgentAddressConflictError,
  AgentAlreadyRegisteredError,
  AgentTitleConflictError,
  classifyRegisterAgentConflict,
  createAgent,
  createAgentForPerson,
  getAgentIdsJoinableAsActive,
  joinAgent,
  resolveJoinStatus,
} from "../../../../server/utils/data/write-agent-registration";

const createAddressMock = vi.fn();
vi.mock("../../../../server/utils/data/for-routes", () => ({
  createAddress: (...args: unknown[]) => createAddressMock(...args),
}));

const getDistrictFromPostcodeMock = vi.fn();
vi.mock("../../../../data/utils/get-district", () => ({
  getDistrictFromPostcode: (...args: unknown[]) =>
    getDistrictFromPostcodeMock(...args),
}));

const isEmailDomainTrustedMock = vi.fn();
vi.mock("../../../../server/utils/data/is-trusted-domain", () => ({
  isEmailDomainTrusted: (...args: unknown[]) =>
    isEmailDomainTrustedMock(...args),
}));

const txnManager: any = { getRepository: vi.fn(), query: vi.fn() };

// Agent.find (address-dedup lookup) and Agent.findOne (joinAgent's
// exists/unclaimed check, createAgent's title-conflict lookup) — kept
// distinct from the AgentPerson repo mocks below since routing now depends
// on which entity's repository is requested (unlike before fe#911's
// `unclaimed` flag, joinAgent only ever touched AgentPerson).
const agentRepoFind = vi.fn();
const agentRepoFindOne = vi.fn();

const agentPersonRepoFind = vi.fn();

vi.mock("../../../../data/data-source", () => ({
  dataSource: {
    manager: { transaction: async (cb: any) => cb(txnManager) },
    getRepository: (entity: any) =>
      entity?.name === "Agent"
        ? { find: agentRepoFind, findOne: agentRepoFindOne }
        : { find: agentPersonRepoFind },
  },
}));

const agentSave = vi.fn();
const agentUpdate = vi.fn();
const agentPersonSave = vi.fn();
const agentPersonFind = vi.fn();
const agentLanguageSave = vi.fn();
const agentServiceSave = vi.fn();
const personUpdate = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();

  txnManager.getRepository.mockImplementation((entity: any) => {
    switch (entity) {
      case Agent:
        return {
          save: agentSave,
          find: agentRepoFind,
          findOne: agentRepoFindOne,
          update: agentUpdate,
        };
      case AgentPerson:
        return { save: agentPersonSave, find: agentPersonFind };
      case AgentLanguage:
        return { save: agentLanguageSave };
      case AgentService:
        return { save: agentServiceSave };
      case Person:
        return { update: personUpdate };
      default:
        throw new Error(`unexpected repo: ${entity?.name}`);
    }
  });

  // Default: the address-dedup lookup (dataSource.getRepository(Agent).find)
  // finds no existing agent, so createAgentForPerson proceeds to create.
  agentRepoFind.mockResolvedValue([]);

  // Default: the registrant has no coordinator membership yet.
  agentPersonFind.mockResolvedValue([]);

  // Default: domain not on the trusted allowlist (member-match decides).
  isEmailDomainTrustedMock.mockResolvedValue(false);

  // Default: the agent's postcode maps to no district.
  getDistrictFromPostcodeMock.mockResolvedValue(null);

  agentSave.mockImplementation(async (a: any) => ({ ...a, id: 33 }));
  agentPersonSave.mockImplementation(async (ap: any) => ({ ...ap, id: 44 }));
  agentLanguageSave.mockImplementation(async (rows: any[]) => rows);
  agentServiceSave.mockImplementation(async (rows: any[]) => rows);
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

  // be#1059: district is derived from the postcode on create, same as on
  // PATCH (be#827) — a client-supplied districtId is never trusted. The SDK
  // no longer types districtId (sdk#264), so payloads that still send it, as
  // old clients may, are cast.
  it("derives districtId from the resolved Address's postcode, ignoring a client-supplied districtId", async () => {
    createAddressMock.mockResolvedValueOnce({ id: 99, postcodeId: 3 });
    getDistrictFromPostcodeMock.mockResolvedValueOnce({ id: 7 });

    await createAgentForPerson(11, {
      title: "Centre HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
      districtId: 1,
    } as ApiAgentRegisterNew);

    expect(getDistrictFromPostcodeMock).toHaveBeenCalledWith(3, txnManager);
    expect(agentSave.mock.calls[0][0].districtId).toBe(7);
  });

  it("leaves districtId unset (not the client value) when no Address resolves", async () => {
    await createAgentForPerson(11, {
      title: "Centre HERO",
      districtId: 1,
    } as ApiAgentRegisterNew);

    expect(getDistrictFromPostcodeMock).not.toHaveBeenCalled();
    expect(agentSave.mock.calls[0][0].districtId).toBeUndefined();
  });

  it("leaves districtId unset when the postcode maps to no district", async () => {
    createAddressMock.mockResolvedValueOnce({ id: 99, postcodeId: 3 });

    await createAgentForPerson(11, {
      title: "Centre HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
      districtId: 1,
    } as ApiAgentRegisterNew);

    expect(agentSave.mock.calls[0][0].districtId).toBeUndefined();
  });

  it("throws AgentAddressConflictError (no create) when street+postcode match an existing agent", async () => {
    // The dedup lookup finds an agent at the same address (getAgentByAddress
    // strict match on normalized street + postcode).
    agentRepoFind.mockResolvedValueOnce([
      {
        id: 77,
        address: {
          street: "Bitterfelder Str 11",
          postcode: { value: "12681" },
        },
      },
    ]);

    const err = await createAgentForPerson(11, {
      title: "Centre HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AgentAddressConflictError);
    expect(err.agentId).toBe(77);
    expect(agentSave).not.toHaveBeenCalled();
  });

  it("creates a distinct agent at an existing agent's address when confirmSharedAddress is set", async () => {
    agentRepoFind.mockResolvedValueOnce([
      {
        id: 77,
        address: {
          street: "Bitterfelder Str 11",
          postcode: { value: "12681" },
        },
      },
    ]);
    createAddressMock.mockResolvedValueOnce({ id: 99 });

    const result = await createAgentForPerson(11, {
      title: "Second Org HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
      confirmSharedAddress: true,
    });

    expect(result.agentId).toBe(33);
    expect(agentRepoFind).not.toHaveBeenCalled();
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

  it("updates person.phone inside the transaction when phone is provided", async () => {
    personUpdate.mockResolvedValue({});

    await createAgentForPerson(11, {
      title: "Centre HERO",
      phone: "+49123456789",
    });

    expect(personUpdate).toHaveBeenCalledWith(
      { id: 11 },
      { phone: "+49123456789" },
    );
  });

  it("skips person.phone update when phone is not provided", async () => {
    await createAgentForPerson(11, { title: "Centre HERO" });

    expect(personUpdate).not.toHaveBeenCalled();
  });

  it("throws AgentAlreadyRegisteredError before the address check when the registrant already coordinates an agent", async () => {
    agentPersonFind.mockResolvedValueOnce([
      { id: 6, agentId: 21, status: AgentMembershipStatus.PENDING },
    ]);

    const err = await createAgentForPerson(11, {
      title: "Centre HERO",
      addressStreet: "Example Str. 1",
      addressPostcode: "10115",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AgentAlreadyRegisteredError);
    expect(err.details).toEqual({
      conflict: "registered",
      agentId: 21,
      membershipStatus: AgentMembershipStatus.PENDING,
    });
    expect(agentRepoFind).not.toHaveBeenCalled();
    expect(agentSave).not.toHaveBeenCalled();
  });

  it("throws AgentTitleConflictError with the existing agent's id on a unique-title violation", async () => {
    agentSave.mockRejectedValueOnce({
      code: "23505",
      detail: "Key (title)=(Centre HERO) already exists.",
    });
    agentRepoFindOne.mockResolvedValueOnce({ id: 55 });

    const err = await createAgentForPerson(11, { title: "Centre HERO" }).catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(AgentTitleConflictError);
    expect(err.agentId).toBe(55);
  });
});

// fe#911: coordinator/admin creates a bare Agent with no linked Person — same
// Agent/Address/Service/Language writes as createAgentForPerson, minus the
// AgentPerson membership (and the phone-on-Person write, which has no person
// to target here).
describe("createAgent", () => {
  it("persists the Agent alone — no AgentPerson, no phone write — marked unclaimed", async () => {
    const result = await createAgent({ title: "Bare Agent HERO" });

    expect(agentSave).toHaveBeenCalledTimes(1);
    expect(agentSave.mock.calls[0][0]).toMatchObject({
      title: "Bare Agent HERO",
      addressId: undefined,
      unclaimed: true,
    });
    expect(agentPersonSave).not.toHaveBeenCalled();
    expect(personUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ agentId: 33 });
  });

  it("throws AgentTitleConflictError with the existing agent's id on a unique-title violation", async () => {
    agentSave.mockRejectedValueOnce({
      code: "23505",
      detail: "Key (title)=(Bare Agent HERO) already exists.",
    });
    agentRepoFindOne.mockResolvedValueOnce({ id: 55 });

    const err = await createAgent({ title: "Bare Agent HERO" }).catch((e) => e);

    expect(err).toBeInstanceOf(AgentTitleConflictError);
    expect(err.agentId).toBe(55);
  });

  it("creates Address and propagates addressId when street+postcode given", async () => {
    createAddressMock.mockResolvedValueOnce({ id: 99 });

    await createAgent({
      title: "Bare Agent HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
    });

    expect(agentSave.mock.calls[0][0].addressId).toBe(99);
  });

  it("throws AgentAddressConflictError (no create) when street+postcode match an existing agent", async () => {
    agentRepoFind.mockResolvedValueOnce([
      {
        id: 77,
        address: {
          street: "Bitterfelder Str 11",
          postcode: { value: "12681" },
        },
      },
    ]);

    const err = await createAgent({
      title: "Bare Agent HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AgentAddressConflictError);
    expect(err.agentId).toBe(77);
    expect(agentSave).not.toHaveBeenCalled();
  });

  it("creates a distinct agent at an existing agent's address when confirmSharedAddress is set", async () => {
    agentRepoFind.mockResolvedValueOnce([
      {
        id: 77,
        address: {
          street: "Bitterfelder Str 11",
          postcode: { value: "12681" },
        },
      },
    ]);
    createAddressMock.mockResolvedValueOnce({ id: 99 });

    const result = await createAgent({
      title: "Second Bare Agent HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
      confirmSharedAddress: true,
    });

    expect(result.agentId).toBe(33);
    expect(agentRepoFind).not.toHaveBeenCalled();
    expect(agentSave.mock.calls[0][0].addressId).toBe(99);
  });

  it("be#1059: derives districtId from the resolved Address's postcode, ignoring a client-supplied districtId", async () => {
    createAddressMock.mockResolvedValueOnce({ id: 99, postcodeId: 3 });
    getDistrictFromPostcodeMock.mockResolvedValueOnce({ id: 7 });

    await createAgent({
      title: "Bare Agent HERO",
      addressStreet: "Bitterfelder Str 11",
      addressPostcode: "12681",
      districtId: 1,
    } as ApiAgentRegisterNew);

    expect(getDistrictFromPostcodeMock).toHaveBeenCalledWith(3, txnManager);
    expect(agentSave.mock.calls[0][0].districtId).toBe(7);
  });

  it("be#1059: derives districtId from a postcode given without a street (no Address created)", async () => {
    getDistrictFromPostcodeMock.mockResolvedValueOnce({ id: 7 });

    await createAgent({
      title: "Bare Agent HERO",
      addressPostcode: "12681",
      districtId: 1,
    } as ApiAgentRegisterNew);

    expect(createAddressMock).not.toHaveBeenCalled();
    expect(getDistrictFromPostcodeMock).toHaveBeenCalledWith(
      { value: "12681" },
      txnManager,
    );
    expect(agentSave.mock.calls[0][0].addressId).toBeUndefined();
    expect(agentSave.mock.calls[0][0].districtId).toBe(7);
  });

  it("be#1059: leaves districtId unset (not the client value) when no Address resolves", async () => {
    await createAgent({
      title: "Bare Agent HERO",
      districtId: 1,
    } as ApiAgentRegisterNew);

    expect(agentSave.mock.calls[0][0].districtId).toBeUndefined();
  });

  it("inserts AgentLanguage and AgentService rows when given", async () => {
    await createAgent({
      title: "Bare Agent HERO",
      languages: [5, 7],
      serviceIds: [1, 2],
    });

    expect(agentLanguageSave).toHaveBeenCalledTimes(1);
    expect(agentLanguageSave.mock.calls[0][0]).toEqual([
      { agentId: 33, languageId: 5 },
      { agentId: 33, languageId: 7 },
    ]);
  });
});

describe("resolveJoinStatus", () => {
  it("only counts ACTIVE members, so a pending join request can't vouch for its own domain", async () => {
    agentPersonRepoFind.mockResolvedValueOnce([]);

    await resolveJoinStatus(33, "newcomer@center.de");

    expect(agentPersonRepoFind.mock.calls[0][0].where).toEqual({
      agentId: 33,
      status: AgentMembershipStatus.ACTIVE,
    });
  });

  it("returns PENDING for an inactive agent, even on a domain match", async () => {
    agentRepoFindOne.mockResolvedValueOnce({
      id: 33,
      engagementStatus: AgentEngagementStatusType.INACTIVE,
    });

    const status = await resolveJoinStatus(33, "newcomer@center.de");

    expect(status).toBe(AgentMembershipStatus.PENDING);
    expect(agentPersonRepoFind).not.toHaveBeenCalled();
  });

  it("returns ACTIVE for an unclaimed agent on a trusted domain", async () => {
    agentRepoFindOne.mockResolvedValueOnce({ id: 33, unclaimed: true });
    agentPersonRepoFind.mockResolvedValueOnce([]);
    isEmailDomainTrustedMock.mockResolvedValueOnce(true);

    const status = await resolveJoinStatus(33, "newcomer@center.de");

    expect(status).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("returns ACTIVE when a member's Person.email shares the registrant's domain", async () => {
    agentPersonRepoFind.mockResolvedValueOnce([
      { person: { email: "existing@center.de", users: [] } },
    ]);
    const status = await resolveJoinStatus(33, "newcomer@center.de");
    expect(status).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("falls back to a member's User email when Person.email is null", async () => {
    agentPersonRepoFind.mockResolvedValueOnce([
      { person: { email: null, users: [{ email: "boss@center.de" }] } },
    ]);
    const status = await resolveJoinStatus(33, "newcomer@center.de");
    expect(status).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("returns PENDING when neither Person nor User emails share the domain", async () => {
    agentPersonRepoFind.mockResolvedValueOnce([
      { person: { email: null, users: [{ email: "boss@elsewhere.de" }] } },
      { person: { email: "other@elsewhere.de", users: [] } },
    ]);
    const status = await resolveJoinStatus(33, "stranger@center.de");
    expect(status).toBe(AgentMembershipStatus.PENDING);
  });

  it("returns PENDING for a malformed email with no domain", async () => {
    const status = await resolveJoinStatus(33, "");
    expect(status).toBe(AgentMembershipStatus.PENDING);
    expect(agentPersonRepoFind).not.toHaveBeenCalled();
  });

  it("returns ACTIVE when no member matches but the domain is trusted", async () => {
    agentPersonRepoFind.mockResolvedValueOnce([
      { person: { email: "old@other.de", users: [] } },
    ]);
    isEmailDomainTrustedMock.mockResolvedValueOnce(true);

    const status = await resolveJoinStatus(33, "newcomer@brandnew.de");
    expect(status).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("be#1001: returns PENDING for a free-email domain even when an existing member shares it, skipping the member lookup entirely", async () => {
    isEmailDomainTrustedMock.mockResolvedValueOnce(false);

    const status = await resolveJoinStatus(33, "newcomer@gmail.com");

    expect(status).toBe(AgentMembershipStatus.PENDING);
    expect(agentPersonRepoFind).not.toHaveBeenCalled();
  });

  it("be#1001: returns ACTIVE for a free-email domain once it's explicitly trusted", async () => {
    isEmailDomainTrustedMock.mockResolvedValueOnce(true);

    const status = await resolveJoinStatus(33, "newcomer@gmail.com");

    expect(status).toBe(AgentMembershipStatus.ACTIVE);
    expect(agentPersonRepoFind).not.toHaveBeenCalled();
  });
});

describe("joinAgent", () => {
  it("404s (not 403) when the agent doesn't exist at all", async () => {
    agentRepoFindOne.mockResolvedValueOnce(null);

    const err = await joinAgent(11, 33, "registrant@example.org").catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(NotFoundError);
    expect(agentPersonSave).not.toHaveBeenCalled();
  });

  // A legacy agent (e.g. created via POST /opportunity/legacy with no
  // rac_email) can also have zero AgentPerson rows, but it is not
  // `unclaimed` — it must stay joinable, unlike a coordinator-created agent.
  it("allows joining a non-unclaimed agent even with zero existing memberships", async () => {
    agentRepoFindOne.mockResolvedValueOnce({ id: 33, unclaimed: false });

    const result = await joinAgent(11, 33, "registrant@example.org");

    expect(agentPersonSave).toHaveBeenCalledTimes(1);
    expect(agentPersonSave.mock.calls[0][0]).toMatchObject({
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

  it("claims the agent when the join is ACTIVE", async () => {
    agentRepoFindOne.mockResolvedValue({ id: 33, unclaimed: true });
    isEmailDomainTrustedMock.mockResolvedValueOnce(true);

    const result = await joinAgent(11, 33, "registrant@center.de");

    expect(result.membershipStatus).toBe(AgentMembershipStatus.ACTIVE);
    expect(agentUpdate).toHaveBeenCalledWith(
      { id: 33, unclaimed: true },
      { unclaimed: false },
    );
  });

  it("leaves the agent unclaimed when the join is PENDING", async () => {
    agentRepoFindOne.mockResolvedValue({ id: 33, unclaimed: true });

    const result = await joinAgent(11, 33, "registrant@center.de");

    expect(result.membershipStatus).toBe(AgentMembershipStatus.PENDING);
    expect(agentUpdate).not.toHaveBeenCalled();
  });

  it("throws AgentAlreadyRegisteredError, preferring the ACTIVE membership, before touching the agent", async () => {
    agentPersonFind.mockResolvedValueOnce([
      { id: 6, agentId: 21, status: AgentMembershipStatus.PENDING },
      { id: 7, agentId: 22, status: AgentMembershipStatus.ACTIVE },
    ]);

    const err = await joinAgent(11, 33, "registrant@example.org").catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(AgentAlreadyRegisteredError);
    expect(err.details).toEqual({
      conflict: "registered",
      agentId: 22,
      membershipStatus: AgentMembershipStatus.ACTIVE,
    });
    expect(txnManager.query).toHaveBeenCalledWith(
      expect.stringContaining("pg_advisory_xact_lock"),
      [11],
    );
    expect(agentRepoFindOne).not.toHaveBeenCalled();
    expect(agentPersonSave).not.toHaveBeenCalled();
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

  it("returns 'organization' for a 23503 violation on organization_id", () => {
    expect(
      classifyRegisterAgentConflict({
        code: "23503",
        detail:
          'Key (organization_id)=(999) is not present in table "organization".',
      }),
    ).toBe("organization");
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

describe("getAgentIdsJoinableAsActive", () => {
  it("returns the agents with a member on the registrant's domain, in one lookup", async () => {
    agentPersonRepoFind.mockResolvedValueOnce([
      { agentId: 1, person: { email: "existing@center.de", users: [] } },
      { agentId: 2, person: { email: "other@elsewhere.de", users: [] } },
      {
        agentId: 3,
        person: { email: null, users: [{ email: "user@center.de" }] },
      },
    ]);

    const ids = await getAgentIdsJoinableAsActive(
      "newcomer@center.de",
      [1, 2, 3],
    );

    expect([...ids].sort()).toEqual([1, 3]);
    expect(agentPersonRepoFind).toHaveBeenCalledTimes(1);
  });

  it("only counts ACTIVE members, so a pending join request can't vouch for its own domain", async () => {
    agentPersonRepoFind.mockResolvedValueOnce([]);

    await getAgentIdsJoinableAsActive("newcomer@center.de", [1]);

    expect(agentPersonRepoFind.mock.calls[0][0].where).toMatchObject({
      status: AgentMembershipStatus.ACTIVE,
    });
  });

  it("returns every agent for a trusted domain without loading members", async () => {
    isEmailDomainTrustedMock.mockResolvedValueOnce(true);

    const ids = await getAgentIdsJoinableAsActive(
      "someone@lafberlin.de",
      [1, 2],
    );

    expect([...ids].sort()).toEqual([1, 2]);
    expect(agentPersonRepoFind).not.toHaveBeenCalled();
  });

  it("returns none for a free-mail domain without loading members", async () => {
    const ids = await getAgentIdsJoinableAsActive("newcomer@gmail.com", [1]);

    expect(ids.size).toBe(0);
    expect(agentPersonRepoFind).not.toHaveBeenCalled();
  });

  it("returns none for an empty email or no agent ids", async () => {
    expect((await getAgentIdsJoinableAsActive("", [1])).size).toBe(0);
    expect((await getAgentIdsJoinableAsActive("a@center.de", [])).size).toBe(0);
    expect(agentPersonRepoFind).not.toHaveBeenCalled();
  });
});

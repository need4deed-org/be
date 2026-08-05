import { beforeEach, describe, expect, it, vi } from "vitest";
import type Agent from "../../../../data/entity/opportunity/agent.entity";
import { getDistrictFromPostcode } from "../../../../data/utils/get-district";
import {
  getDistrictToAgentHandler,
  syncAgentDistrictFromPostcode,
} from "../../../../server/utils";

vi.mock("../../../../data/utils/get-district", () => ({
  getDistrictFromPostcode: vi.fn(),
}));

const mockedGetDistrictFromPostcode = vi.mocked(getDistrictFromPostcode);

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 1,
    districtId: undefined,
    district: undefined,
    address: undefined,
    ...overrides,
  } as Agent;
}

function makeDistrict(overrides: Record<string, unknown> = {}) {
  return { id: 1, title: "Test District", ...overrides };
}

describe("syncAgentDistrictFromPostcode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets district and districtId from the given postcode", async () => {
    const district = makeDistrict({ id: 7 });
    const postcode = { id: 3, value: "12627" } as any;
    mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

    const agent = makeAgent();
    const result = await syncAgentDistrictFromPostcode(agent, postcode);

    expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith(postcode);
    expect(result.district).toBe(district);
    expect(result.districtId).toBe(7);
  });

  it("overwrites an existing, already-set districtId — unlike addDistrictToAgent", async () => {
    const district = makeDistrict({ id: 9 });
    mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

    // Simulates the exact drift bug (be#827): agent already has a stale
    // districtId (e.g. previously client-supplied) that disagrees with what
    // its real postcode resolves to.
    const agent = makeAgent({ districtId: 1 });
    const result = await syncAgentDistrictFromPostcode(agent, {
      id: 5,
    } as any);

    expect(result.districtId).toBe(9);
  });

  it("falls back to agent.address?.postcode when no postcode argument is given", async () => {
    const district = makeDistrict({ id: 2 });
    const postcode = { id: 4 } as any;
    mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

    const agent = makeAgent({ address: { postcode } as any });
    await syncAgentDistrictFromPostcode(agent);

    expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith(postcode);
  });

  it("leaves district/districtId untouched when no district resolves for the postcode", async () => {
    mockedGetDistrictFromPostcode.mockResolvedValue(null);

    const agent = makeAgent({ districtId: 1, district: makeDistrict() as any });
    const result = await syncAgentDistrictFromPostcode(agent, {
      id: 99,
    } as any);

    expect(result.districtId).toBe(1);
  });
});

// Regression guard: addDistrictToAgent (read-time helper) must keep its
// original fill-only-if-empty behavior — the new write-time
// syncAgentDistrictFromPostcode is deliberately a separate function rather
// than a behavior change to this one, since GET routes rely on it never
// overwriting an already-set district on every page load.
describe("getDistrictToAgentHandler — addDistrictToAgent unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not overwrite an already-set districtId", async () => {
    const { addDistrictToAgent } = getDistrictToAgentHandler();
    const agent = makeAgent({ districtId: 1 });

    await addDistrictToAgent(agent);

    expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
    expect(agent.districtId).toBe(1);
  });

  it("fills district when districtId is unset and a district resolves", async () => {
    const district = makeDistrict({ id: 3 });
    mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

    const { addDistrictToAgent, updates } = getDistrictToAgentHandler();
    const agent = makeAgent({ address: { postcode: {} } as any });

    const result = await addDistrictToAgent(agent);

    expect(result.district).toBe(district);
    expect(updates).toContain(agent);
  });
});

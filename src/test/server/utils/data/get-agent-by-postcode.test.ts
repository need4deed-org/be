import { describe, expect, it } from "vitest";
import {
  getAgentByAddress,
  getAgentByPostcode,
} from "../../../../server/utils";

describe("getAgentByPostcode", () => {
  const agents = [
    {
      id: 1,
      address: { postcode: { value: "12345" }, street: "Müllerstraße 48" },
    },
    {
      id: 2,
      address: { postcode: { value: "55555" }, street: "Hauptstr. 10" },
    },
  ] as any;

  it("returns agent for matching postcode", () => {
    expect(getAgentByPostcode(agents, "12345")).toEqual(agents[0]);
    expect(getAgentByPostcode(agents, "55555")).toEqual(agents[1]);
  });

  it("returns undefined for unknown postcode", () => {
    expect(getAgentByPostcode(agents, "99999")).toBeUndefined();
  });
});

describe("getAgentByAddress — street normalisation", () => {
  const agent = {
    id: 1,
    address: { postcode: { value: "13353" }, street: "Müllerstraße 48" },
  } as any;
  const agents = [agent];
  const plz = "13353";

  const variants = [
    "Müllerstraße 48",
    "Müllerstr. 48",
    "Müllerstr 48",
    "Müller Straße 48",
    "Müller str. 48",
    "Müller str 48",
    "MÜLLERSTRASSE 48",
  ];

  variants.forEach((street) => {
    it(`matches "${street}"`, () => {
      expect(getAgentByAddress(agents, street, plz)).toEqual(agent);
    });
  });

  it("does not match wrong postcode", () => {
    expect(
      getAgentByAddress(agents, "Müllerstraße 48", "00000"),
    ).toBeUndefined();
  });

  it("does not match wrong street", () => {
    expect(getAgentByAddress(agents, "Hauptstraße 1", plz)).toBeUndefined();
  });

  it("matches by street alone when PLZ is omitted", () => {
    expect(getAgentByAddress(agents, "Müllerstraße 48")).toEqual(agent);
  });

  it("does not match wrong street when PLZ is omitted", () => {
    expect(getAgentByAddress(agents, "Hauptstraße 1")).toBeUndefined();
  });
});

describe("getAgentByAddress — fuzzy fallback for legacy agents", () => {
  const legacyAgent = {
    id: 3,
    title: "Refugium Hausvaterweg",
    address: null,
    agentPostcode: [{ postcode: { value: "13353" } }],
  } as any;
  const agents = [legacyAgent];
  const plz = "13353";

  it("matches form address street name against agent title via agentPostcode PLZ", () => {
    expect(getAgentByAddress(agents, "Hausvaterweg 21", plz)).toEqual(
      legacyAgent,
    );
  });

  it("does not match when PLZ differs", () => {
    expect(
      getAgentByAddress(agents, "Hausvaterweg 21", "99999"),
    ).toBeUndefined();
  });

  it("does not match when street name not in title", () => {
    expect(getAgentByAddress(agents, "Berliner Straße 5", plz)).toBeUndefined();
  });

  it("narrows to the agent whose title contains the house number when multiple share the street", () => {
    const agentAt21 = {
      id: 5,
      title: "Refugium Hausvaterweg 21",
      address: null,
      agentPostcode: [{ postcode: { value: "13353" } }],
    } as any;
    const agentAt45 = {
      id: 6,
      title: "AWO Hausvaterweg 45",
      address: null,
      agentPostcode: [{ postcode: { value: "13353" } }],
    } as any;
    expect(
      getAgentByAddress([agentAt21, agentAt45], "Hausvaterweg 21", plz),
    ).toEqual(agentAt21);
    expect(
      getAgentByAddress([agentAt21, agentAt45], "Hausvaterweg 45", plz),
    ).toEqual(agentAt45);
  });

  it("returns undefined when multiple agents share street and PLZ and none has the number in title", () => {
    const second = {
      id: 5,
      title: "AWO Hausvaterweg",
      address: null,
      agentPostcode: [{ postcode: { value: "13353" } }],
    } as any;
    expect(
      getAgentByAddress([legacyAgent, second], "Hausvaterweg 21", plz),
    ).toBeUndefined();
  });

  it("does not match 'Heerstr 10' when form submits 'Heerstr 110' (number prefix false positive)", () => {
    const heerstr10 = {
      id: 6,
      title: "Heerstr 10",
      address: null,
      agentPostcode: [{ postcode: { value: "13353" } }],
    } as any;
    expect(
      getAgentByAddress([heerstr10], "Heerstr 110", "13353"),
    ).toBeUndefined();
  });

  it("matches 'Heerstr 110' agent when form submits 'Heerstr 110'", () => {
    const heerstr10 = {
      id: 6,
      title: "Heerstr 10",
      address: null,
      agentPostcode: [{ postcode: { value: "13353" } }],
    } as any;
    const heerstr110 = {
      id: 7,
      title: "Heerstr 110",
      address: null,
      agentPostcode: [{ postcode: { value: "13353" } }],
    } as any;
    expect(
      getAgentByAddress([heerstr10, heerstr110], "Heerstr 110", "13353"),
    ).toEqual(heerstr110);
  });

  it("does not false-match when street name is a substring of a different street in title", () => {
    const agent = {
      id: 4,
      title: "Unterkunft Ostringstraße",
      address: null,
      agentPostcode: [{ postcode: { value: "13353" } }],
    } as any;
    // "Ringstraße 3" → street name "ringstr" — must NOT match "ostringstr"
    expect(getAgentByAddress([agent], "Ringstraße 3", "13353")).toBeUndefined();
  });

  it("matches address with hyphenated house number range", () => {
    expect(getAgentByAddress(agents, "Hausvaterweg 5-7", plz)).toEqual(
      legacyAgent,
    );
  });

  it("matches address with space-separated letter suffix (e.g. '21 A')", () => {
    expect(getAgentByAddress(agents, "Hausvaterweg 21 A", plz)).toEqual(
      legacyAgent,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  getAgentByAddress,
  getAgentByPostcode,
} from "../../../../server/utils";

describe("getAgentByPostcode", () => {
  const agents = [
    { id: 1, address: { postcode: { value: "12345" }, street: "Müllerstraße 48" } },
    { id: 2, address: { postcode: { value: "55555" }, street: "Hauptstr. 10" } },
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
    expect(getAgentByAddress(agents, "Müllerstraße 48", "00000")).toBeUndefined();
  });

  it("does not match wrong street", () => {
    expect(getAgentByAddress(agents, "Hauptstraße 1", plz)).toBeUndefined();
  });
});

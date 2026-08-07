import { describe, expect, it } from "vitest";
import { getOpportunityRepresentativePerson } from "../../../data/utils/get-opportunity-representative-person";

describe("getOpportunityRepresentativePerson", () => {
  it("prefers the stored contactPerson over submittedByPerson (be#833)", () => {
    // A manual relink (be#824) or the creation-time snapshot (be#833) is the
    // authoritative, deliberately-set value — it must win even though the
    // submitter also has an email.
    const opportunity = {
      contactPerson: { id: 1, email: "contact@center.de" },
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: { representative: { person: { id: 3, email: "rep@center.de" } } },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(1);
  });

  it("falls back to submittedByPerson when there is no stored contactPerson", () => {
    const opportunity = {
      contactPerson: undefined,
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: { representative: { person: { id: 3, email: "rep@center.de" } } },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(2);
  });

  it("falls back to the agent representative when neither contactPerson nor submittedByPerson is set", () => {
    const opportunity = {
      contactPerson: undefined,
      submittedByPerson: undefined,
      agent: { representative: { person: { id: 3, email: "rep@center.de" } } },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(3);
  });

  it("skips a candidate with no email in favor of one that has it", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: { representative: { person: { id: 3, email: "rep@center.de" } } },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(2);
  });

  it("falls back to a candidate without an email when none has one", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: undefined,
      agent: { representative: undefined },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(1);
  });
});

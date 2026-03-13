import { describe, expect, it } from "vitest";
import { dtoCommunication } from "../../../services";

describe("dtoCommunication", () => {
  it("should correctly map all fields from Communication to ApiCommunicationGet", () => {
    const mockCommunication = {
      id: "comm-123",
      contactType: "OUTBOUND",
      contactMethod: "EMAIL",
      communicationType: "FOLLOW_UP",
      date: new Date("2026-03-14T10:00:00Z"),
      agentId: "agent-007",
      userId: "user-99",
      internalNotes: "This should be stripped out",
    };

    const result = dtoCommunication(mockCommunication as any);

    expect(result).toEqual({
      id: "comm-123",
      contactType: "OUTBOUND",
      contactMethod: "EMAIL",
      communicationType: "FOLLOW_UP",
      date: mockCommunication.date,
      agentId: "agent-007",
      userId: "user-99",
    });
  });

  it("should not contain extra fields from the source object", () => {
    const mockCommunication = {
      id: "1",
      agentId: "A1",
      secretField: "don-not-expose",
    };

    const result = dtoCommunication(mockCommunication as any);

    expect(result).not.toHaveProperty("secretField");
  });
});

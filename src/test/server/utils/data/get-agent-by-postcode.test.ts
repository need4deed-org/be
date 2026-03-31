import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../../../config";
import { getAgentByPostcode } from "../../../../server/utils";

// Mocking the error if necessary, though usually, you can just check the instance
describe("getAgentByPostcode", () => {
  const mockAgent1 = { id: 1, name: "Agent Smith" };
  const mockAgent2 = { id: 2, name: "Agent Brown" };

  const agents = [
    {
      agentPostcode: [
        { postcode: { value: "12345" }, agent: mockAgent1 },
        { postcode: { value: "67890" }, agent: mockAgent1 },
      ],
    },
    {
      agentPostcode: [{ postcode: { value: "55555" }, agent: mockAgent2 }],
    },
  ] as any; // Using 'as any' to bypass complex Entity typing for the test

  it("should return the correct agent when a matching postcode is found", () => {
    const result = getAgentByPostcode(agents, "12345");
    expect(result).toEqual(mockAgent1);

    const result2 = getAgentByPostcode(agents, "55555");
    expect(result2).toEqual(mockAgent2);
  });

  it("should throw a NotFoundError if the postcode does not exist", () => {
    const invalidPlz = "99999";

    expect(() => getAgentByPostcode(agents, invalidPlz)).toThrow(NotFoundError);
    expect(() => getAgentByPostcode(agents, invalidPlz)).toThrow(
      `Agent for postcode:${invalidPlz} not found.`,
    );
  });

  it("should throw a NotFoundError if the agents array is empty", () => {
    expect(() => getAgentByPostcode([], "12345")).toThrow(NotFoundError);
  });

  it("should return the agent from the first matching postcode if duplicates exist", () => {
    const duplicateAgents = [
      {
        agentPostcode: [{ postcode: { value: "11111" }, agent: mockAgent1 }],
      },
      {
        agentPostcode: [{ postcode: { value: "11111" }, agent: mockAgent2 }],
      },
    ] as any;

    const result = getAgentByPostcode(duplicateAgents, "11111");
    expect(result).toEqual(mockAgent1);
  });
});
